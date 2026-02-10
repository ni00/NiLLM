import { useAppStore } from '../../lib/store'
import { BenchmarkResult, LLMModel } from '../../lib/types'

// --- RAF Batching Logic ---
let pendingUpdates: Record<string, Partial<BenchmarkResult>> = {}
let rafId: number | null = null

function flushUpdates() {
    const store = useAppStore.getState()
    if (Object.keys(pendingUpdates).length > 0) {
        store.setBatchedStreamingData(pendingUpdates)
        pendingUpdates = {}
    }
    rafId = requestAnimationFrame(flushUpdates)
}

// Start the loop globally once (idempotent check inside module usually fine,
// strictly speaking we might want to start/stop based on activity,
// but for a lightweight loop checking empty object, it's negligible overhead)
if (typeof window !== 'undefined' && !rafId) {
    rafId = requestAnimationFrame(flushUpdates)
}

// Constants for timeouts (Defaults)
const DEFAULT_CONNECT_TIMEOUT = 15000
const DEFAULT_READ_TIMEOUT = 30000

function runWorkerStream(
    model: LLMModel,
    messages: any[],
    resultId: string,
    sessionId: string
) {
    const store = useAppStore.getState()
    const connectTimeoutMs =
        model.config?.connectTimeout || DEFAULT_CONNECT_TIMEOUT
    const readTimeoutMs = model.config?.readTimeout || DEFAULT_READ_TIMEOUT

    return new Promise<void>((resolve) => {
        // Instantiate the worker
        const worker = new Worker(
            new URL('../../lib/workers/stream.worker.ts', import.meta.url),
            {
                type: 'module'
            }
        )

        let currentText = ''
        let connectTimeout: NodeJS.Timeout | null = null
        let readTimeout: NodeJS.Timeout | null = null

        const cleanup = () => {
            if (connectTimeout) clearTimeout(connectTimeout)
            if (readTimeout) clearTimeout(readTimeout)
            worker.terminate()
            // Clean up pending updates for this result to avoid zombie updates
            delete pendingUpdates[resultId]
        }

        const handleError = (errorMsg: string) => {
            console.error(`Error with model ${model.name}:`, errorMsg)
            store.updateResult(sessionId, model.id, resultId, {
                error: errorMsg
            })
            store.clearStreamingData(resultId)
            cleanup()
            resolve() // Resolve anyway to not block the queue
        }

        // Set initial connection timeout
        connectTimeout = setTimeout(() => {
            handleError(
                `Connection timed out after ${connectTimeoutMs / 1000}s`
            )
        }, connectTimeoutMs)

        worker.onmessage = (e) => {
            const { type, textDelta, metrics, isFinal, error } = e.data

            // Reset read timeout on any activity
            if (readTimeout) clearTimeout(readTimeout)
            // Clear connect timeout on first successful update/start
            if (connectTimeout && (type === 'start' || type === 'update')) {
                clearTimeout(connectTimeout)
                connectTimeout = null
            }

            if (type === 'start') {
                // Started successfully, now watch for read timeout
                readTimeout = setTimeout(() => {
                    handleError(
                        `Stream timed out (no data for ${readTimeoutMs / 1000}s)`
                    )
                }, readTimeoutMs)
                return
            }

            if (type === 'update') {
                // Refresh read timeout
                readTimeout = setTimeout(() => {
                    handleError(
                        `Stream timed out (no data for ${readTimeoutMs / 1000}s)`
                    )
                }, readTimeoutMs)

                if (textDelta) {
                    currentText += textDelta
                }

                // RAF Batching: Queue update instead of setting immediately
                pendingUpdates[resultId] = {
                    response: currentText,
                    metrics
                }

                if (isFinal) {
                    // Update persistent store with final result immediately to ensure consistency
                    store.updateResult(sessionId, model.id, resultId, {
                        response: currentText,
                        metrics
                    })
                    // No need to clear from pendingUpdates, the next generic flush will handle the transient state,
                    // or we can remove it to be cleaner, but overwriting is fine.
                }
            } else if (type === 'done') {
                store.clearStreamingData(resultId)
                cleanup()
                resolve()
            } else if (type === 'error') {
                handleError(error || 'Unknown error')
            }
        }

        worker.onerror = () => {
            handleError('Worker initialization failed')
        }

        // Start the worker
        worker.postMessage({
            model,
            messages,
            resultId
        })
    })
}

export async function broadcastMessage(
    prompt: string,
    existingSessionId?: string
) {
    const store = useAppStore.getState()
    const activeModels = store.models.filter((m) =>
        store.activeModelIds.includes(m.id)
    )

    if (activeModels.length === 0) {
        throw new Error('No active models selected')
    }

    const sessionId =
        existingSessionId ||
        store.activeSessionId ||
        store.createSession(prompt.slice(0, 30) + '...', store.activeModelIds)
    const session = store.sessions.find((s) => s.id === sessionId)

    const promises = activeModels.map(async (model) => {
        const resultId = crypto.randomUUID()

        // Merge config: Global < Model Override
        const mergedConfig = {
            ...store.globalConfig,
            ...model.config
        }

        // Create a model object with merged config
        const modelWithMergedConfig = {
            ...model,
            config: mergedConfig
        }

        // Build history for this specific model
        const history: any[] = []
        if (session && session.results[model.id]) {
            session.results[model.id].forEach((res) => {
                history.push({ role: 'user', content: res.prompt })
                if (res.response) {
                    history.push({ role: 'assistant', content: res.response })
                }
            })
        }

        const messages: any[] = []
        if (store.globalConfig.systemPrompt) {
            messages.push({
                role: 'system',
                content: store.globalConfig.systemPrompt
            })
        }

        messages.push(...history, { role: 'user', content: prompt })

        // Initial empty result
        const initialResult: BenchmarkResult = {
            id: resultId,
            modelId: model.id,
            prompt,
            response: '',
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
            timestamp: Date.now()
        }
        store.addResult(sessionId, model.id, initialResult)

        // Run streaming via worker
        await runWorkerStream(
            modelWithMergedConfig,
            messages,
            resultId,
            sessionId
        )
    })

    await Promise.all(promises)
    return sessionId
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

    // Reset result state to loading/empty
    store.updateResult(sessionId, modelId, resultId, {
        error: undefined,
        response: '',
        metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
        timestamp: Date.now()
    })

    // Build history from previous results
    const historyResults = modelResults.slice(0, resultIndex)
    const history: any[] = []
    historyResults.forEach((res) => {
        history.push({ role: 'user', content: res.prompt })
        if (res.response) {
            history.push({ role: 'assistant', content: res.response })
        }
    })

    // Build messages
    const messages: any[] = []
    if (store.globalConfig.systemPrompt) {
        messages.push({
            role: 'system',
            content: store.globalConfig.systemPrompt
        })
    }
    messages.push(...history, { role: 'user', content: resultToRetry.prompt })

    // Merge config
    const mergedConfig = {
        ...store.globalConfig,
        ...model.config
    }
    const modelWithMergedConfig = {
        ...model,
        config: mergedConfig
    }

    // Run stream
    // Note: We don't await this inside the UI handler typically, but here we can return the promise.
    await runWorkerStream(modelWithMergedConfig, messages, resultId, sessionId)
}
