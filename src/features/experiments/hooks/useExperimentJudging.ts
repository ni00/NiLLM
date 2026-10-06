import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import type {
    BenchmarkResult,
    ExperimentRun,
    ExperimentTask,
    JudgeEvaluation
} from '@/lib/types'
import {
    registerStreamCancellation,
    streamGeneration
} from '@/lib/streaming/cancellation'
import { resultStatus } from '@/lib/statistics'
import {
    DEFAULT_JUDGE_PROMPT,
    judgeResponses,
    resolveJudgeExecutionModel
} from '../judge'
import { cancelExperimentJudging, registerExperimentJudging } from '../runtime'

export interface JudgingAnswer {
    taskId: string
    resultId: string
    response: string
}

/** One frozen case×variant×repeat group with anonymous completed answers. */
export interface JudgingGroup {
    caseId: string
    variantId: string
    repeatIndex: number
    orderKey: string
    prompt: string
    expected?: string
    answers: JudgingAnswer[]
}

export type JudgingStatus =
    | { kind: 'error'; code: 'no-judge-model' }
    | {
          kind: 'error'
          code: 'group-failed'
          reason: string
          index: number
          total: number
      }
    | { kind: 'info'; code: 'deleted' }
    | { kind: 'info'; code: 'stopped' }
    | { kind: 'info'; code: 'finished'; total: number }

/** Only the latest attempt can contribute to the current scoring scope. */
export function latestCompletedAttempt(
    task: ExperimentTask
): BenchmarkResult | undefined {
    const attempt = task.attempts.at(-1)
    return attempt && resultStatus(attempt) === 'completed'
        ? attempt
        : undefined
}

/** Group latest completed chat attempts in task order by case×variant×repeat. */
export function buildJudgingGroups(
    run: ExperimentRun,
    variantIds: readonly string[],
    repeatIndex: number
): JudgingGroup[] {
    const variantSet = new Set(variantIds)
    const caseById = new Map(run.testSet.cases.map((c) => [c.id, c]))
    const chatModelIds = new Set(
        run.models.filter((m) => m.mode !== 'image').map((m) => m.id)
    )
    const groups = new Map<string, JudgingGroup>()
    for (const task of run.tasks) {
        if (task.repeatIndex !== repeatIndex || !variantSet.has(task.variantId))
            continue
        const testCase = caseById.get(task.caseId)

        if (!testCase || !chatModelIds.has(task.modelId)) continue
        const attempt = latestCompletedAttempt(task)
        if (!attempt) continue
        const key = `${task.caseId}\u0000${task.variantId}`
        let group = groups.get(key)
        if (!group) {
            group = {
                caseId: task.caseId,
                variantId: task.variantId,
                repeatIndex,
                orderKey: `${run.id}:${task.caseId}:${task.variantId}:${repeatIndex}`,
                prompt: testCase.prompt,
                expected: testCase.expected,
                answers: []
            }
            groups.set(key, group)
        }
        group.answers.push({
            taskId: task.id,
            resultId: attempt.id,
            response: attempt.response
        })
    }
    return [...groups.values()]
}

/** Apply only to the same completed attempt; ignore deleted or rerun results. */
function applyIfCurrent(
    runId: string,
    taskId: string,
    resultId: string,
    evaluation: JudgeEvaluation
): void {
    const state = useAppStore.getState()
    const run = state.experimentRuns.find((r) => r.id === runId)
    const task = run?.tasks.find((t) => t.id === taskId)
    const attempt = task?.attempts.find((a) => a.id === resultId)
    if (!run || !task || !attempt) return
    if (
        task.attempts.at(-1)?.id !== resultId ||
        resultStatus(attempt) !== 'completed'
    )
        return
    state.updateExperimentResult(runId, taskId, resultId, {
        judgeEvaluation: evaluation
    })
}

/** Set while a batch runs so a remounted detail page can still cancel it. */
let activeJudgingRunId: string | null = null

/** Serialize anonymous judge calls under the shared lock; keep old scores
 * on failure/cancellation and support cancellation after route remounts. */
export function useExperimentJudging(runId: string) {
    const isJudging = useAppStore((state) => state.isJudging)
    const isProcessing = useAppStore((state) => state.isProcessing)
    const models = useAppStore((state) => state.models)
    const [judgeModelId, setJudgeModelId] = useState('')
    const [judgePrompt, setJudgePrompt] = useState(DEFAULT_JUDGE_PROMPT)
    const [status, setStatus] = useState<JudgingStatus | null>(null)
    const [progress, setProgress] = useState<{
        done: number
        total: number
    } | null>(null)

    const judgeCandidates = useMemo(
        () =>
            models.filter(
                (model) => model.enabled && (model.mode ?? 'chat') === 'chat'
            ),
        [models]
    )

    // True only while this run owns the shared judging lock; module state
    // survives route remounts the same way the runtime registry does.
    const judgingHere = isJudging && activeJudgingRunId === runId

    const start = useCallback(
        async (groups: readonly JudgingGroup[]) => {
            // Read and take the shared lock from one live snapshot: the button
            // can be stale after renders, the store cannot.
            const store = useAppStore.getState()
            if (
                groups.length === 0 ||
                store.isProcessing ||
                store.isJudging ||
                runId.length === 0
            )
                return
            const judgeModel = store.models.find(
                (model) => model.id === judgeModelId
            )
            if (!judgeModel || !judgeModel.enabled) {
                setStatus({ kind: 'error', code: 'no-judge-model' })
                return
            }

            const { model: executionJudge } = resolveJudgeExecutionModel(
                store.globalConfig,
                judgeModel
            )

            store.setJudging(true)
            activeJudgingRunId = runId
            setStatus(null)
            setProgress({ done: 0, total: groups.length })

            const controller = new AbortController()
            let settle!: () => void
            const settled = new Promise<void>((resolve) => {
                settle = resolve
            })
            const unregisterJudging = registerExperimentJudging(
                runId,
                controller,
                settled
            )
            const unregisterStream = registerStreamCancellation(() =>
                controller.abort()
            )
            const generation = streamGeneration()

            try {
                for (let index = 0; index < groups.length; index++) {
                    if (
                        controller.signal.aborted ||
                        streamGeneration() !== generation
                    )
                        break
                    if (
                        !useAppStore
                            .getState()
                            .experimentRuns.some((r) => r.id === runId)
                    ) {
                        setStatus({ kind: 'info', code: 'deleted' })
                        break
                    }
                    const group = groups[index]
                    try {
                        const evaluated = await judgeResponses({
                            judgeModel: executionJudge,
                            prompt: group.prompt,
                            expected: group.expected,
                            answers: group.answers.map((answer) => ({
                                resultId: answer.resultId,
                                response: answer.response
                            })),
                            orderKey: group.orderKey,
                            judgePrompt,
                            signal: controller.signal
                        })
                        if (
                            controller.signal.aborted ||
                            streamGeneration() !== generation
                        )
                            break
                        for (const { resultId, evaluation } of evaluated) {
                            const answer = group.answers.find(
                                (candidate) => candidate.resultId === resultId
                            )
                            if (!answer) continue
                            applyIfCurrent(
                                runId,
                                answer.taskId,
                                resultId,
                                evaluation
                            )
                        }
                        setProgress({ done: index + 1, total: groups.length })
                    } catch (error) {
                        if (
                            controller.signal.aborted ||
                            streamGeneration() !== generation
                        )
                            break
                        // Stop on a rejected group so the user can adjust the judge and retry.

                        setStatus({
                            kind: 'error',
                            code: 'group-failed',
                            reason:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                            index: index + 1,
                            total: groups.length
                        })
                        break
                    }
                }
                if (
                    controller.signal.aborted ||
                    streamGeneration() !== generation
                ) {
                    setStatus(
                        (current) =>
                            current ?? { kind: 'info', code: 'stopped' }
                    )
                } else {
                    setStatus(
                        (current) =>
                            current ?? {
                                kind: 'info',
                                code: 'finished',
                                total: groups.length
                            }
                    )
                }
            } finally {
                unregisterJudging()
                unregisterStream()
                activeJudgingRunId = null
                setProgress(null)
                useAppStore.getState().setJudging(false)
                settle()
            }
        },
        [runId, judgeModelId, judgePrompt]
    )

    const cancel = useCallback(() => {
        // No-op unless this run owns the active batch; the registry survives
        // route remounts, so cancellation works from a freshly opened page.
        void cancelExperimentJudging(runId)
    }, [runId])

    return {
        judgeCandidates,
        judgeModelId,
        setJudgeModelId,
        judgePrompt,
        setJudgePrompt,
        status,
        progress,
        isJudging,
        isProcessing,
        judgingHere,
        start,
        cancel
    }
}

/** Sum known judging cost once per call ID; unknown usage remains absent. */
export function summarizeJudgeCost(tasks: readonly ExperimentTask[]): {
    cost: number | undefined
    calls: number
    scoredCalls: number
} {
    const callIds = new Set<string>()
    const pricedCallIds = new Set<string>()
    let cost: number | undefined
    for (const task of tasks) {
        for (const attempt of task.attempts) {
            const evaluation = attempt.judgeEvaluation
            if (!evaluation) continue
            callIds.add(evaluation.judgeCallId)
            const callCost = evaluation.usage?.cost
            if (
                callCost != null &&
                !pricedCallIds.has(evaluation.judgeCallId)
            ) {
                pricedCallIds.add(evaluation.judgeCallId)
                cost = (cost ?? 0) + callCost
            }
        }
    }
    return { cost, calls: callIds.size, scoredCalls: pricedCallIds.size }
}

/** Scoring coverage over latest completed chat attempts only. */
export function summarizeScoringCoverage(run: ExperimentRun): {
    eligible: number
    ruleCovered: number
    judgeCovered: number
} {
    const chatModelIds = new Set(
        run.models.filter((m) => m.mode !== 'image').map((m) => m.id)
    )
    let eligible = 0
    let ruleCovered = 0
    let judgeCovered = 0
    for (const task of run.tasks) {
        if (!chatModelIds.has(task.modelId)) continue

        const attempt = latestCompletedAttempt(task)
        if (!attempt) continue
        eligible++
        if (attempt.ruleEvaluation) ruleCovered++
        if (attempt.judgeEvaluation) judgeCovered++
    }
    return { eligible, ruleCovered, judgeCovered }
}
