import { useAppStore } from '@/lib/store'
import type {
    ExperimentRun,
    ExperimentTask,
    LLMModel,
    Message,
    ModelSnapshot
} from '@/lib/types'
import { getBaseURL } from '@/lib/providers/catalog'
import { endpointFingerprint } from '@/features/benchmark/snapshots'
import { runWorkerStream } from '@/features/benchmark/worker-stream'
import { runConcurrent } from '@/features/benchmark/concurrency'
import { scheduleStreamingUpdate } from '@/features/benchmark/streaming-ui'
import { registerExperimentExecution } from './runtime'

const MODEL_UNAVAILABLE =
    'Experiment model configuration is no longer available.'

/**
 * Builds the execution model from the frozen snapshot; only the API key and
 * the identity-checked base URL come from the live model, so current pricing
 * or provider changes never rewrite history.
 */
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
    if (
        !freshRun ||
        freshRun.status !== 'running' ||
        !freshTask ||
        !freshRun.pendingTaskIds.includes(task.id) ||
        signal.aborted
    )
        return

    const snapshot = freshRun.models.find((m) => m.id === task.modelId)
    const resolved =
        freshRun.configByModelVariant[task.modelId]?.[task.variantId]
    const testCase = freshRun.testSet.cases.find((c) => c.id === task.caseId)
    if (!snapshot || !resolved || !testCase) {
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
                attempt: freshTask.attempts.length + 1
            }
        })
        return
    }

    const live = useAppStore
        .getState()
        .models.find((m) => m.id === task.modelId)
    const executionModel = live && (await buildExecutionModel(snapshot, live))
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
    executionModel.config = resolved.effective

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
    useAppStore.getState().updateExperimentResult(run.id, task.id, resultId, {
        response: outcome.response,
        reasoning: outcome.reasoning,
        metrics: outcome.metrics,
        status: outcome.status,
        error: outcome.error
    })
}

/**
 * Drains a queued experiment: tasks dispatch in canonical order up to the
 * frozen concurrency limit, re-checking run state and the abort signal before
 * every dispatch. Pause/cancel stop new dispatches and let in-flight tasks
 * settle; unexpected throws mark the run interrupted and recover attempts.
 */
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
        const planned = run.tasks.filter((task) =>
            run.pendingTaskIds.includes(task.id)
        )
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
