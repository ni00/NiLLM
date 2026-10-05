import { useAppStore } from '@/lib/store'
import type {
    ExperimentRun,
    ExperimentTask,
    LLMModel,
    Message,
    ModelSnapshot
} from '@/lib/types'
import { getBaseURL } from '@/lib/providers/catalog'
import { applyModelCapabilities } from '@/features/benchmark/config'
import { hasImageInput } from '@/lib/streaming/messages'
import { endpointFingerprint } from '@/features/benchmark/snapshots'
import { runWorkerStream } from '@/features/benchmark/worker-stream'
import { runConcurrent } from '@/features/benchmark/concurrency'
import { scheduleStreamingUpdate } from '@/features/benchmark/streaming-ui'
import { registerExperimentExecution } from './runtime'
import { evaluateExpected } from './domain/scoring'

const MODEL_UNAVAILABLE =
    'Experiment model configuration is no longer available.'

/** Execute the frozen snapshot; only credentials and an identity-checked
 * endpoint come from the live model. */
async function buildExecutionModel(
    snapshot: ModelSnapshot,
    live: LLMModel
): Promise<LLMModel | undefined> {
    let fingerprint: string
    try {
        fingerprint = await endpointFingerprint(getBaseURL(live))
    } catch {
        return undefined
    }
    const identityMatches =
        live.provider === snapshot.provider &&
        (live.providerId ?? live.id) === (snapshot.providerId ?? snapshot.id) &&
        (live.mode ?? 'chat') === snapshot.mode &&
        live.decisionProtocol === snapshot.decisionProtocol &&
        fingerprint === snapshot.endpointFingerprint
    if (!identityMatches) return undefined
    return {
        id: snapshot.id,
        name: snapshot.name,
        provider: snapshot.provider,
        ...(snapshot.providerName !== undefined && {
            providerName: snapshot.providerName
        }),
        ...(snapshot.providerId !== undefined && {
            providerId: snapshot.providerId
        }),
        apiKey: live.apiKey,
        baseURL: live.baseURL,
        enabled: true,
        mode: snapshot.mode,
        decisionProtocol: snapshot.decisionProtocol,
        ...(snapshot.pricing !== undefined && {
            pricing: { ...snapshot.pricing }
        }),
        ...(snapshot.capabilities !== undefined && {
            capabilities: { ...snapshot.capabilities }
        })
    }
}

async function runExperimentTask(
    run: ExperimentRun,
    task: ExperimentTask,
    signal: AbortSignal
): Promise<void> {
    const store = useAppStore.getState()
    const freshRun = store.experimentRuns.find((r) => r.id === run.id)
    const freshTask = freshRun?.tasks.find((t) => t.id === task.id)
    const snapshot = freshRun?.models.find((m) => m.id === task.modelId)
    const resolvedBase =
        freshRun?.configByModelVariant[task.modelId]?.[task.variantId]
    const testCase = freshRun?.testSet.cases.find((c) => c.id === task.caseId)
    if (
        !freshRun ||
        freshRun.status !== 'running' ||
        !freshTask ||
        !freshRun.pendingTaskIds.includes(task.id) ||
        signal.aborted
    )
        return
    if (!snapshot || !resolvedBase || !testCase) {
        useAppStore.getState().appendExperimentAttempt(run.id, task.id, {
            id: crypto.randomUUID(),
            modelId: task.modelId,
            prompt: testCase?.prompt ?? '',
            response: '',
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
            timestamp: Date.now(),
            status: 'error',
            error: MODEL_UNAVAILABLE,
            experiment: {
                runId: run.id,
                taskId: task.id,
                attempt: (freshTask?.attempts.length ?? 0) + 1
            }
        })
        return
    }

    const live = useAppStore
        .getState()
        .models.find((m) => m.id === task.modelId)
    const executionModel = live && (await buildExecutionModel(snapshot, live))
    const current = useAppStore
        .getState()
        .experimentRuns.find((r) => r.id === run.id)
    if (signal.aborted || current?.status !== 'running') return
    if (!executionModel) {
        useAppStore.getState().appendExperimentAttempt(run.id, task.id, {
            id: crypto.randomUUID(),
            modelId: task.modelId,
            prompt: testCase.prompt,
            response: '',
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
            timestamp: Date.now(),
            status: 'error',
            error: MODEL_UNAVAILABLE,
            experiment: {
                runId: run.id,
                taskId: task.id,
                attempt: freshTask.attempts.length + 1
            }
        })
        return
    }
    const resolved = applyModelCapabilities(
        resolvedBase,
        snapshot.capabilities,
        snapshot
    )
    executionModel.config = resolved.effective

    // Declared vision=false fails before any network call; unknown
    // capabilities still send.
    if (
        snapshot.capabilities?.vision === false &&
        hasImageInput([{ role: 'user', content: testCase.prompt }])
    ) {
        useAppStore.getState().appendExperimentAttempt(run.id, task.id, {
            id: crypto.randomUUID(),
            modelId: task.modelId,
            prompt: testCase.prompt,
            response: '',
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
            timestamp: Date.now(),
            status: 'error',
            error: 'This model does not support image input.',
            experiment: {
                runId: run.id,
                taskId: task.id,
                attempt: freshTask.attempts.length + 1
            }
        })
        return
    }

    // Independent-case context: only this case's system/user message, never
    // conversation history or @-mention routing.
    const messages: Message[] = []
    if (resolved.requested.systemPrompt)
        messages.push({
            role: 'system',
            content: resolved.requested.systemPrompt
        })
    messages.push({ role: 'user', content: testCase.prompt })

    const resultId = crypto.randomUUID()
    const attemptNumber = freshTask.attempts.length + 1
    const appended = useAppStore
        .getState()
        .appendExperimentAttempt(run.id, task.id, {
            id: resultId,
            modelId: task.modelId,
            prompt: testCase.prompt,
            response: '',
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
            timestamp: Date.now(),
            status: 'pending',
            experiment: {
                runId: run.id,
                taskId: task.id,
                attempt: attemptNumber
            }
        })
    if (!appended) return

    const outcome = await runWorkerStream({
        model: executionModel,
        messages,
        resultId,
        onUpdate: (update) => scheduleStreamingUpdate(resultId, update),
        signal
    })
    scheduleStreamingUpdate(resultId, null)
    const rule =
        outcome.status === 'completed' && snapshot.mode !== 'image'
            ? evaluateExpected(testCase, outcome.response)
            : undefined
    useAppStore.getState().updateExperimentResult(run.id, task.id, resultId, {
        response: outcome.response,
        reasoning: outcome.reasoning,
        metrics: outcome.metrics,
        status: outcome.status,
        error: outcome.error,
        ruleEvaluation: rule ? { ...rule, evaluatedAt: Date.now() } : undefined
    })
}

/** Dispatch in plan order at the frozen concurrency limit. Pause/cancel stops
 * new work; in-flight tasks settle before interruption recovery. */
export async function runExperiment(runId: string): Promise<void> {
    const store = useAppStore.getState()
    const run = store.experimentRuns.find((r) => r.id === runId)
    if (!run || run.status !== 'queued') return

    const controller = new AbortController()
    let settle!: () => void
    const settled = new Promise<void>((resolve) => {
        settle = resolve
    })
    const unregister = registerExperimentExecution(runId, controller, settled)
    useAppStore.getState().beginExperiment(runId, Date.now())
    try {
        const pending = new Set(run.pendingTaskIds)
        const planned = run.tasks.filter((task) => pending.has(task.id))
        await runConcurrent(planned, run.maxConcurrent, async (task) =>
            runExperimentTask(run, task, controller.signal)
        )
    } catch (error) {
        console.error('Experiment execution failed:', error)
        useAppStore.getState().interruptExperiment(runId)
    } finally {
        useAppStore.getState().settleExperiment(runId, Date.now())
        unregister()
        settle()
    }
}
