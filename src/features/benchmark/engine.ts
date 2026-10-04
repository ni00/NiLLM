import { useAppStore } from '../../lib/store'
import { BenchmarkResult, Message } from '../../lib/types'

import { runWorkerStream } from './worker-stream'
import {
    cancelAllStreams,
    streamGeneration
} from '@/lib/streaming/cancellation'

let pendingUpdates: Record<string, Partial<BenchmarkResult>> = {}
let rafId: number | null = null
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

function scheduleUpdate(id: string, update: Partial<BenchmarkResult> | null) {
    if (update) {
        pendingUpdates[id] = update
        scheduleFlush()
    } else delete pendingUpdates[id]
}

async function runConcurrent<T>(
    items: T[],
    concurrency: number,
    task: (item: T) => Promise<void>
) {
    let index = 0
    await Promise.all(
        Array.from(
            { length: Math.min(concurrency, items.length) },
            async () => {
                while (index < items.length) await task(items[index++])
            }
        )
    )
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

        const mergedConfig = {
            ...store.globalConfig,
            ...model.config
        }

        const modelWithMergedConfig = {
            ...model,
            config: mergedConfig
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
        if (model.config?.systemPrompt ?? store.globalConfig.systemPrompt) {
            messages.push({
                role: 'system',
                content:
                    model.config?.systemPrompt ??
                    store.globalConfig.systemPrompt ??
                    ''
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
            status: 'pending'
        }
        store.addResult(sessionId, model.id, initialResult)

        // Run streaming via worker
        await runWorkerStream(
            modelWithMergedConfig,
            messages,
            resultId,
            sessionId,
            scheduleUpdate
        )
    })

    return sessionId
}

export function abortAllTasks() {
    cancelAllStreams()
    pendingUpdates = {}
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
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

    store.updateResult(sessionId, modelId, resultId, {
        error: undefined,
        response: '',
        reasoning: undefined,
        status: 'pending',
        metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
        timestamp: Date.now()
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
    if (model.config?.systemPrompt ?? store.globalConfig.systemPrompt) {
        messages.push({
            role: 'system',
            content:
                model.config?.systemPrompt ??
                store.globalConfig.systemPrompt ??
                ''
        })
    }
    messages.push(...history, { role: 'user', content: resultToRetry.prompt })

    const mergedConfig = {
        ...store.globalConfig,
        ...model.config
    }
    const modelWithMergedConfig = {
        ...model,
        config: mergedConfig
    }

    await runWorkerStream(
        modelWithMergedConfig,
        messages,
        resultId,
        sessionId,
        scheduleUpdate
    )
}
