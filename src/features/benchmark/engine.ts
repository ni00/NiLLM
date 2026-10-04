import { runConcurrent } from './concurrency'
import { resolveGenerationConfig } from './config'
import { captureModelSnapshot } from './snapshots'
import { runWorkerStream, type StreamOutcome } from './worker-stream'
import { scheduleStreamingUpdate, abortStreamingUI } from './streaming-ui'
import {
    cancelAllStreams,
    registerStreamCancellation,
    streamGeneration
} from '@/lib/streaming/cancellation'
import { useAppStore } from '@/lib/store'
import {
    BenchmarkResult,
    LLMModel,
    Message,
    RequestSnapshot
} from '@/lib/types'

/** Runs one streamed request; the caller owns the initial result record. */
async function executeStream(
    sessionId: string,
    modelId: string,
    executionModel: LLMModel,
    messages: Message[],
    resultId: string
): Promise<StreamOutcome> {
    const controller = new AbortController()
    const unregister = registerStreamCancellation(() => controller.abort())
    try {
        const outcome = await runWorkerStream({
            model: executionModel,
            messages,
            resultId,
            onUpdate: (update) => scheduleStreamingUpdate(resultId, update),
            signal: controller.signal
        })
        scheduleStreamingUpdate(resultId, null)
        const store = useAppStore.getState()
        store.updateResult(sessionId, modelId, resultId, {
            response: outcome.response,
            reasoning: outcome.reasoning,
            metrics: outcome.metrics,
            status: outcome.status,
            error: outcome.error
        })
        store.clearStreamingData(resultId)
        return outcome
    } finally {
        unregister()
    }
}

export async function broadcastMessage(
    prompt: string,
    existingSessionId?: string
) {
    const store = useAppStore.getState()
    const activeModels = store.models.filter(
        (m) => m.enabled && store.activeModelIds.includes(m.id)
    )

    if (activeModels.length === 0) {
        throw new Error('No active models selected')
    }

    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const mentionedModels = activeModels.filter((m) => {
        const pattern = new RegExp(
            `@${escapeRegExp(m.name)}($|\\s|\\.|,|\\?|!)`,
            'i'
        )
        return pattern.test(prompt)
    })

    const targetModels =
        mentionedModels.length > 0 ? mentionedModels : activeModels

    let processedPrompt = prompt
    if (mentionedModels.length > 0) {
        mentionedModels.forEach((m) => {
            const pattern = new RegExp(
                `@${escapeRegExp(m.name)}(?=$|\\s|\\.|,|\\?|!)`,
                'gi'
            )
            processedPrompt = processedPrompt.replace(pattern, '')
        })
        processedPrompt = processedPrompt.replace(/\s+/g, ' ').trim()
    }

    const sessionId =
        existingSessionId ||
        store.activeSessionId ||
        store.createSession(
            processedPrompt.slice(0, 30) + '...',
            store.activeModelIds
        )
    const session = store.sessions.find((s) => s.id === sessionId)

    const generation = streamGeneration()
    const requestedConcurrency = store.globalConfig.maxConcurrent ?? 4
    const concurrency = Number.isFinite(requestedConcurrency)
        ? Math.max(1, Math.min(16, Math.floor(requestedConcurrency)))
        : 4
    await runConcurrent(targetModels, concurrency, async (model) => {
        if (generation !== streamGeneration()) return
        const resultId = crypto.randomUUID()

        const resolved = resolveGenerationConfig(
            useAppStore.getState().globalConfig,
            model.config
        )

        // Snapshots are captured before dispatch so digest time never lands
        // in provider TTFT; a broken endpoint fails only this model.
        let snapshot: RequestSnapshot
        try {
            const modelSnapshot = await captureModelSnapshot(model)
            snapshot = {
                schemaVersion: 1,
                model: modelSnapshot,
                parameters: resolved,
                context: 'conversation',
                capturedAt: Date.now()
            }
        } catch {
            useAppStore.getState().addResult(sessionId, model.id, {
                id: resultId,
                modelId: model.id,
                prompt: processedPrompt,
                response: '',
                metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
                timestamp: Date.now(),
                status: 'error',
                error: 'Invalid model endpoint configuration.'
            })
            return
        }

        const history: Message[] = []
        if (session && session.results[model.id]) {
            session.results[model.id].forEach((res) => {
                history.push({ role: 'user', content: res.prompt })
                if (res.response) {
                    history.push({ role: 'assistant', content: res.response })
                }
            })
        }

        const messages: Message[] = []
        if (resolved.requested.systemPrompt) {
            messages.push({
                role: 'system',
                content: resolved.requested.systemPrompt
            })
        }

        messages.push(...history, { role: 'user', content: processedPrompt })

        const initialResult: BenchmarkResult = {
            id: resultId,
            modelId: model.id,
            prompt: processedPrompt,
            response: '',
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
            timestamp: Date.now(),
            status: 'pending',
            requestSnapshot: snapshot
        }
        useAppStore.getState().addResult(sessionId, model.id, initialResult)

        await executeStream(
            sessionId,
            model.id,
            { ...model, config: resolved.effective },
            messages,
            resultId
        )
    })

    return sessionId
}

export function abortAllTasks() {
    cancelAllStreams()
    abortStreamingUI()
}

export async function retryResult(
    sessionId: string,
    modelId: string,
    resultId: string
) {
    const store = useAppStore.getState()
    const session = store.sessions.find((s) => s.id === sessionId)
    if (!session) return

    const model = store.models.find((m) => m.id === modelId)
    if (!model) return

    const modelResults = session.results[modelId] || []
    const resultIndex = modelResults.findIndex((r) => r.id === resultId)
    if (resultIndex === -1) return

    const resultToRetry = modelResults[resultIndex]

    const resolved = resolveGenerationConfig(
        useAppStore.getState().globalConfig,
        model.config
    )

    let snapshot: RequestSnapshot | undefined
    try {
        snapshot = {
            schemaVersion: 1,
            model: await captureModelSnapshot(model),
            parameters: resolved,
            context: 'conversation',
            capturedAt: Date.now()
        }
    } catch {
        useAppStore.getState().updateResult(sessionId, modelId, resultId, {
            status: 'error',
            error: 'Invalid model endpoint configuration.'
        })
        return
    }

    useAppStore.getState().updateResult(sessionId, modelId, resultId, {
        error: undefined,
        response: '',
        reasoning: undefined,
        status: 'pending',
        metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
        timestamp: Date.now(),
        requestSnapshot: snapshot
    })

    const historyResults = modelResults.slice(0, resultIndex)
    const history: Message[] = []
    historyResults.forEach((res) => {
        history.push({ role: 'user', content: res.prompt })
        if (res.response) {
            history.push({ role: 'assistant', content: res.response })
        }
    })

    const messages: Message[] = []
    if (resolved.requested.systemPrompt) {
        messages.push({
            role: 'system',
            content: resolved.requested.systemPrompt
        })
    }
    messages.push(...history, { role: 'user', content: resultToRetry.prompt })

    await executeStream(
        sessionId,
        model.id,
        { ...model, config: resolved.effective },
        messages,
        resultId
    )
}
