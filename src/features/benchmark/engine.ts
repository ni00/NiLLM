import { streamResponse } from '../../lib/ai-provider'
import { useAppStore } from '../../lib/store'
import { BenchmarkResult } from '../../lib/types'

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

    // Use provided sessionId, or current activeSessionId, or create a new one
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

        // Create a model object with merged config for streamResponse
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

        // Add system prompt if defined
        const messages: any[] = []
        if (store.globalConfig.systemPrompt) {
            messages.push({
                role: 'system',
                content: store.globalConfig.systemPrompt
            })
        }

        // Add history and the new message
        messages.push(...history, { role: 'user', content: prompt })

        let currentText = ''
        let currentMetrics = {
            ttft: 0,
            tps: 0,
            totalDuration: 0,
            tokenCount: 0
        }

        const startTime = performance.now()

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

        try {
            const { fullStream } = await streamResponse(
                modelWithMergedConfig,
                messages,
                (metrics) => {
                    const { tokens, ...rest } = metrics as any
                    currentMetrics = {
                        ...currentMetrics,
                        ...rest,
                        tokenCount: tokens ?? currentMetrics.tokenCount
                    }
                    // Update metrics specifically (e.g. TTFT)
                    store.updateResult(sessionId, model.id, resultId, {
                        metrics: {
                            ttft: currentMetrics.ttft || 0,
                            tps: currentMetrics.tps || 0,
                            tokenCount: currentMetrics.tokenCount || 0,
                            totalDuration: performance.now() - startTime
                        }
                    })
                }
            )

            const reader = fullStream.getReader()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                if (value.type === 'text-delta') {
                    const delta =
                        (value as any).textDelta ?? (value as any).text ?? ''
                    currentText += delta

                    // Streaming update
                    store.updateResult(sessionId, model.id, resultId, {
                        response: currentText,
                        metrics: {
                            ...currentMetrics,
                            totalDuration: performance.now() - startTime
                        }
                    })
                }
            }

            const endTime = performance.now()
            const totalDuration = endTime - startTime

            // Final update
            store.updateResult(sessionId, model.id, resultId, {
                response: currentText,
                metrics: {
                    ttft: currentMetrics.ttft || 0,
                    tps: currentMetrics.tps || 0,
                    tokenCount: currentMetrics.tokenCount || 0,
                    totalDuration: totalDuration
                }
            })
        } catch (error: any) {
            console.error(`Error with model ${model.name}:`, error)
            store.updateResult(sessionId, model.id, resultId, {
                error: error.message || 'Unknown error'
            })
        }
    })

    await Promise.all(promises)
    return sessionId
}
