import { useAppStore } from '../../lib/store'
import { BenchmarkResult, LLMModel } from '../../lib/types'

let pendingUpdates: Record<string, Partial<BenchmarkResult>> = {}
let rafId: number | null = null
const activeTasks = new Map<Worker, () => void>()
let isPaused = false

function scheduleFlush() {
    if (rafId === null && !isPaused) {
        rafId = requestAnimationFrame(flushUpdates)
    }
}

function flushUpdates() {
    rafId = null
    if (isPaused) return

    const store = useAppStore.getState()
    if (Object.keys(pendingUpdates).length > 0) {
        store.setBatchedStreamingData(pendingUpdates)
        pendingUpdates = {}
    }
    if (Object.keys(pendingUpdates).length > 0 && !isPaused) {
        rafId = requestAnimationFrame(flushUpdates)
    }
}

export function pauseStreamingUI() {
    isPaused = true
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }
}

export function resumeStreamingUI() {
    const wasPaused = isPaused
    isPaused = false
    if (wasPaused && Object.keys(pendingUpdates).length > 0) {
        scheduleFlush()
    }
}

export function getPendingUpdatesCount(): number {
    return Object.keys(pendingUpdates).length
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
        activeTasks.set(worker, resolve)

        let currentText = ''
        let currentReasoning = ''
        let connectTimeout: NodeJS.Timeout | null = null
        let readTimeout: NodeJS.Timeout | null = null

        const cleanup = () => {
            if (connectTimeout) clearTimeout(connectTimeout)
            if (readTimeout) clearTimeout(readTimeout)
            worker.terminate()
            activeTasks.delete(worker)
            // Clean up pending updates for this result to avoid zombie updates
            delete pendingUpdates[resultId]
        }

        const handleError = (errorMsg: string) => {
            console.error(
                `Error with model ${model.name}:`,
                errorMsg.slice(0, 500)
            )
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
            const { type, textDelta, reasoningDelta, metrics, isFinal, error } =
                e.data

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

                if (reasoningDelta) {
                    currentReasoning += reasoningDelta
                }

                // RAF Batching: Queue update instead of setting immediately
                pendingUpdates[resultId] = {
                    response: currentText,
                    reasoning: currentReasoning || undefined,
                    metrics
                }
                scheduleFlush()

                if (isFinal) {
                    // Update persistent store with final result immediately to ensure consistency
                    store.updateResult(sessionId, model.id, resultId, {
                        response: currentText,
                        reasoning: currentReasoning || undefined,
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

        worker.onerror = (err) => {
            console.error('Worker error:', err)
            handleError('Worker initialization failed')
            cleanup() // Ensure cleanup on worker error
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

    // Helper to escape regex special characters
    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    // Check for @ mentions
    const mentionedModels = activeModels.filter((m) => {
        // Match @ModelName followed by end of string or whitespace/punctuation
        // Case insensitive matching
        const pattern = new RegExp(
            `@${escapeRegExp(m.name)}($|\\s|\\.|,|\\?|!)`,
            'i'
        )
        return pattern.test(prompt)
    })

    const targetModels =
        mentionedModels.length > 0 ? mentionedModels : activeModels

    // Strip mentions from prompt if any were found
    let processedPrompt = prompt
    if (mentionedModels.length > 0) {
        mentionedModels.forEach((m) => {
            const pattern = new RegExp(
                `@${escapeRegExp(m.name)}(?=$|\\s|\\.|,|\\?|!)`,
                'gi'
            )
            processedPrompt = processedPrompt.replace(pattern, '')
        })
        // Clean up accumulation of spaces
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

    const promises = targetModels.map(async (model) => {
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

        messages.push(...history, { role: 'user', content: processedPrompt })

        // Initial empty result
        const displayPrompt = processedPrompt.replace(
            /<<<<IMAGE_START>>>>.*?<<<<IMAGE_END>>>>/gs,
            '[Image]'
        )
        console.log(
            'Adding result with prompt:',
            displayPrompt.slice(0, 100) +
                (displayPrompt.length > 100 ? '...' : '')
        )

        const initialResult: BenchmarkResult = {
            id: resultId,
            modelId: model.id,
            prompt: processedPrompt,
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

export function abortAllTasks() {
    activeTasks.forEach((resolve, worker) => {
        worker.terminate()
        resolve()
    })
    activeTasks.clear()
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
