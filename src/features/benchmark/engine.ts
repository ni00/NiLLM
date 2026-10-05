import { runConcurrent } from './concurrency'
import { resolveGenerationConfig, applyModelCapabilities } from './config'
import { captureModelSnapshot } from './snapshots'
import { runWorkerStream, type StreamOutcome } from './worker-stream'
import { scheduleStreamingUpdate } from './streaming-ui'
import { hasImageInput } from '@/lib/streaming/messages'
import { parseDecisionPrompt } from '@/features/decisions/domain'
import { useAppStore } from '@/lib/store'
import {
    registerStreamCancellation,
    streamGeneration
} from '@/lib/streaming/cancellation'
import {
    BenchmarkResult,
    LLMModel,
    Message,
    RequestSnapshot
} from '@/lib/types'

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

    const isDecision = activeModels.some(
        (model) => model.mode === 'decision' || model.provider === 'typesafe'
    )
    if (isDecision) {
        if (activeModels.some((model) => model.mode !== 'decision'))
            throw new Error(
                'Set every selected model to Decision mode for a comparable task.'
            )
        parseDecisionPrompt(prompt)
    }
    const mentionedModels = isDecision
        ? []
        : activeModels.filter((m) => {
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

        const resolved = applyModelCapabilities(
            resolveGenerationConfig(
                useAppStore.getState().globalConfig,
                model.config
            ),
            model.capabilities,
            model
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
                context:
                    model.mode === 'decision' ? 'independent' : 'conversation',
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
        if (generation !== streamGeneration()) return

        const history: Message[] = []
        if (model.mode !== 'decision' && session && session.results[model.id]) {
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

        // Declared vision=false fails before any network call; unknown
        // capabilities still send (the provider may ignore the image).
        if (model.capabilities?.vision === false && hasImageInput(messages)) {
            useAppStore.getState().addResult(sessionId, model.id, {
                id: resultId,
                modelId: model.id,
                prompt: processedPrompt,
                response: '',
                metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
                timestamp: Date.now(),
                status: 'error',
                error: 'This model does not support image input.',
                requestSnapshot: snapshot
            })
            return
        }

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
            {
                ...model,
                pricing: snapshot.model.pricing,
                config: resolved.effective
            },
            messages,
            resultId
        )
    })

    return sessionId
}

export async function retryResult(
    sessionId: string,
    modelId: string,
    resultId: string
) {
    const store = useAppStore.getState()
    const generation = streamGeneration()
    const session = store.sessions.find((s) => s.id === sessionId)
    if (!session) return

    const model = store.models.find((m) => m.id === modelId)
    if (!model) return

    const modelResults = session.results[modelId] || []
    const resultIndex = modelResults.findIndex((r) => r.id === resultId)
    if (resultIndex === -1) return

    const resultToRetry = modelResults[resultIndex]

    const resolved = applyModelCapabilities(
        resolveGenerationConfig(
            useAppStore.getState().globalConfig,
            model.config
        ),
        model.capabilities,
        model
    )

    let snapshot: RequestSnapshot | undefined
    try {
        snapshot = {
            schemaVersion: 1,
            model: await captureModelSnapshot(model),
            parameters: resolved,
            context: model.mode === 'decision' ? 'independent' : 'conversation',
            capturedAt: Date.now()
        }
    } catch {
        useAppStore.getState().updateResult(sessionId, modelId, resultId, {
            status: 'error',
            error: 'Invalid model endpoint configuration.'
        })
        return
    }

    const historyResults =
        model.mode === 'decision' ? [] : modelResults.slice(0, resultIndex)
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

    if (generation !== streamGeneration()) return
    if (model.capabilities?.vision === false && hasImageInput(messages)) {
        store.updateResult(sessionId, modelId, resultId, {
            status: 'error',
            error: 'This model does not support image input.',
            requestSnapshot: snapshot
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

    await executeStream(
        sessionId,
        model.id,
        {
            ...model,
            pricing: snapshot.model.pricing,
            config: resolved.effective
        },
        messages,
        resultId
    )
}
