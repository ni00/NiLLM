import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { LLMModel, ChatSession } from '@/lib/types'
import { resultStatus } from '@/lib/statistics'
import {
    registerStreamCancellation,
    streamGeneration
} from '@/lib/streaming/cancellation'
import {
    DEFAULT_JUDGE_PROMPT,
    judgeResponses,
    resolveJudgeExecutionModel
} from '@/features/experiments/judge'

// Kept outside component state so an in-flight batch stays cancellable after
// an arena route remount (the fresh mount's cancelJudge aborts this one).
let activeJudgeController: AbortController | null = null

export const useAutoJudge = (
    activeModels: LLMModel[],
    activeSession: ChatSession | undefined
) => {
    const models = useAppStore((state) => state.models)
    const isJudging = useAppStore((state) => state.isJudging)
    const [judgeModelId, setJudgeModelId] = useState<string>('')
    const [judgeStatus, setJudgeStatus] = useState<string | null>(null)
    const [showJudgePanel, setShowJudgePanel] = useState(false)
    const [judgePrompt, setJudgePrompt] = useState(DEFAULT_JUDGE_PROMPT)

    // Fire-and-forget status timers must never outlive the hook or leak
    // into a later judging run's fresh status.
    const statusTimersRef = useRef<number[]>([])

    const clearStatusTimers = () => {
        for (const id of statusTimersRef.current) clearTimeout(id)
        statusTimersRef.current = []
    }

    const scheduleStatusClear = (fn: () => void, delay: number) => {
        clearStatusTimers()
        statusTimersRef.current.push(setTimeout(fn, delay))
    }

    useEffect(() => clearStatusTimers, [])

    useEffect(() => {
        const eligible = models.filter(
            (model) => model.enabled && (model.mode ?? 'chat') === 'chat'
        )
        if (!judgeModelId && eligible.length > 0) {
            const preferred = eligible.find(
                (m) =>
                    m.id.includes('gpt-4') ||
                    m.id.includes('claude-3') ||
                    m.id.includes('pro')
            )
            setJudgeModelId(preferred ? preferred.id : eligible[0].id)
        }
    }, [models, judgeModelId])

    const handleAutoJudge = async () => {
        const store = useAppStore.getState()
        // A stale status-clear timer must not wipe this run's fresh status.
        clearStatusTimers()
        // Shared lock: never start while a generation or another judging
        // batch is running; the queue processor likewise waits for judging.
        if (
            !activeSession ||
            activeModels.length === 0 ||
            store.isJudging ||
            store.isProcessing
        )
            return

        const judgeModel = store.models.find((m) => m.id === judgeModelId)
        if (
            !judgeModel ||
            !judgeModel.enabled ||
            (judgeModel.mode ?? 'chat') !== 'chat'
        ) {
            setJudgeStatus('Error: No judge model selected')
            return
        }

        const controller = new AbortController()
        const unregister = registerStreamCancellation(() => controller.abort())
        activeJudgeController = controller
        // Held until the whole batch settles — never released early on
        // cancel, so late requests and follow-up groups stay excluded.
        store.setJudging(true)
        const generation = streamGeneration()
        setJudgeStatus('Gathering model responses...')

        try {
            // Human stars are protected on write, not excluded from AI evidence.
            const candidates: {
                modelId: string
                resultId: string
                prompt: string
                response: string
            }[] = []
            for (const model of activeModels) {
                if (model.mode === 'image') continue
                const results = activeSession.results[model.id] || []
                const lastResult = results[results.length - 1]
                if (!lastResult || resultStatus(lastResult) !== 'completed')
                    continue
                candidates.push({
                    modelId: model.id,
                    resultId: lastResult.id,
                    prompt: lastResult.prompt,
                    response: lastResult.response
                })
            }

            if (candidates.length === 0) {
                setJudgeStatus('Error: No completed responses to judge')
                scheduleStatusClear(() => setJudgeStatus(null), 3000)
                return
            }

            const prompt = candidates[0].prompt
            if (candidates.some((candidate) => candidate.prompt !== prompt)) {
                // Never send answers to different questions in one group.
                setJudgeStatus(
                    'Error: Select responses to the same prompt before judging.'
                )
                scheduleStatusClear(() => setJudgeStatus(null), 3000)
                return
            }

            setJudgeStatus(`Consulting ${judgeModel.name}...`)

            const { model: executionModel } = resolveJudgeExecutionModel(
                useAppStore.getState().globalConfig,
                judgeModel
            )
            const outcomes = await judgeResponses({
                judgeModel: executionModel,
                prompt,
                answers: candidates.map(({ resultId, response }) => ({
                    resultId,
                    response
                })),
                orderKey: activeSession.id,
                judgePrompt,
                signal: controller.signal
            })
            if (
                controller.signal.aborted ||
                streamGeneration() !== generation
            ) {
                setJudgeStatus('Cancelled')
                return
            }

            const updateResult = useAppStore.getState().updateResult
            const fresh = useAppStore
                .getState()
                .sessions.find((session) => session.id === activeSession.id)
            for (const { resultId, evaluation } of outcomes) {
                const candidate = candidates.find(
                    (entry) => entry.resultId === resultId
                )
                if (!candidate) continue
                const target = fresh?.results[candidate.modelId]?.find(
                    (result) => result.id === resultId
                )
                if (!target || resultStatus(target) !== 'completed') continue
                updateResult(activeSession.id, candidate.modelId, resultId, {
                    judgeEvaluation: evaluation,
                    ...(target.ratingSource !== 'human' && {
                        rating: Math.round(
                            (evaluation.accuracy +
                                evaluation.instructionFollowing +
                                evaluation.completeness) /
                                3
                        ),
                        ratingSource: 'ai' as const,
                        ratedAt: Date.now()
                    })
                })
            }

            setJudgeStatus('Success! Ratings applied.')
            scheduleStatusClear(() => {
                setShowJudgePanel(false)
                setJudgeStatus(null)
            }, 1000)
        } catch (e) {
            if (controller.signal.aborted) {
                setJudgeStatus('Cancelled')
            } else {
                console.error('Judge request failed.')
                setJudgeStatus(
                    `Error: ${e instanceof Error ? e.message : 'Failed to judge'}`
                )
            }
        } finally {
            if (activeJudgeController === controller)
                activeJudgeController = null
            unregister()
            store.setJudging(false)
        }
    }

    const cancelJudge = () => {
        // The batch's catch/finally sets the status and releases the lock.
        activeJudgeController?.abort()
    }

    return {
        isJudging,
        judgeModelId,
        setJudgeModelId,
        judgeStatus,
        setJudgeStatus,
        showJudgePanel,
        setShowJudgePanel,
        judgePrompt,
        setJudgePrompt,
        handleAutoJudge,
        cancelJudge
    }
}
