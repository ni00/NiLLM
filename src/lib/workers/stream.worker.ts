import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, type LanguageModel } from 'ai'
import { LLMModel } from '../types'

// Re-implementing simplified getProvider to avoid importing the whole ai-provider which might have side effects
// or we can just import it if we are sure. Let's try to be self-contained in worker to be safe and clean.

const providerRegistry: Record<string, any> = {}

function getProvider(model: LLMModel) {
    const providerKey = `${model.provider}:${model.providerId || 'default'}`

    if (providerRegistry[providerKey]) {
        return providerRegistry[providerKey]
    }

    const providerType = model.provider as string

    if (
        providerType === 'openrouter' ||
        providerType === 'openai' ||
        providerType === 'custom'
    ) {
        let baseURL = model.baseURL

        if (!baseURL) {
            if (providerType === 'openrouter')
                baseURL = 'https://openrouter.ai/api/v1'
            if (providerType === 'openai') baseURL = 'https://api.openai.com/v1'
        }

        if (!baseURL) {
            throw new Error(`BaseURL is required for ${providerType} provider`)
        }

        const provider = createOpenAICompatible({
            name: providerType,
            baseURL,
            headers:
                providerType === 'openrouter'
                    ? {
                          'HTTP-Referer': 'https://github.com/ni00/nillm',
                          'X-Title': 'NiLLM'
                      }
                    : undefined
        })

        providerRegistry[providerKey] = provider
        return provider
    }

    throw new Error(`Provider ${model.provider} not supported yet`)
}

self.onmessage = async (e: MessageEvent) => {
    const { model, messages, resultId } = e.data

    try {
        const providerFactory = getProvider(model)
        const languageModel: LanguageModel = providerFactory(
            model.providerId || model.id
        )

        const start = performance.now()
        let firstTokenTime: number | undefined
        let tokenCount = 0
        let currentText = ''
        let currentReasoning = ''

        // Batching state
        let pendingTextDelta = ''
        let pendingReasoningDelta = ''
        let lastUpdateTime = 0
        const BATCH_INTERVAL = 50 // ms

        // Send initial start message
        self.postMessage({
            type: 'start',
            resultId
        })

        const result = streamText({
            model: languageModel,
            messages,
            headers: model.apiKey
                ? {
                      Authorization: `Bearer ${model.apiKey}`
                  }
                : undefined,
            temperature: model.config?.temperature,
            topP: model.config?.topP,
            topK: model.config?.topK,
            maxOutputTokens: model.config?.maxTokens,
            frequencyPenalty: model.config?.frequencyPenalty,
            presencePenalty: model.config?.presencePenalty,
            seed: model.config?.seed,
            stopSequences: model.config?.stopSequences,
            providerOptions: {
                openai: {
                    ...(model.config?.minP !== undefined
                        ? { min_p: model.config.minP }
                        : {}),
                    ...(model.config?.repetitionPenalty !== undefined
                        ? { repetition_penalty: model.config.repetitionPenalty }
                        : {})
                }
            }
        })

        const reader = result.fullStream.getReader()
        let firstTokenReceived = false

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const now = performance.now()

            if (
                !firstTokenReceived &&
                (value.type === 'text-delta' ||
                    value.type === 'reasoning-delta')
            ) {
                firstTokenReceived = true
                firstTokenTime = now
            }

            if (value.type === 'reasoning-delta') {
                const delta =
                    (value as any).text || (value as any).textDelta || ''
                if (delta) {
                    pendingReasoningDelta += delta
                    currentReasoning += delta
                }
            }

            if (value.type === 'text-delta') {
                const delta = value.text
                pendingTextDelta += delta
                currentText += delta

                // Token estimation
                const isCJK = /[\u4e00-\u9fa5]/.test(delta)
                if (isCJK) {
                    tokenCount += delta.length * 1.5
                } else {
                    tokenCount += Math.max(1, delta.length / 4)
                }
            }

            // Check if we need to send an update
            if (
                now - lastUpdateTime > BATCH_INTERVAL ||
                value.type === 'finish'
            ) {
                const metrics = {
                    ttft: firstTokenTime
                        ? Math.round(firstTokenTime - start)
                        : 0,
                    tokenCount: Math.round(tokenCount),
                    totalDuration: now - start,
                    tps: 0
                }

                // Calculate TPS
                const durationSeconds = metrics.totalDuration / 1000
                if (durationSeconds > 0) {
                    metrics.tps = metrics.tokenCount / durationSeconds
                }

                self.postMessage({
                    type: 'update',
                    resultId,
                    textDelta: pendingTextDelta,
                    reasoningDelta: pendingReasoningDelta || undefined,
                    metrics,
                    isFinal: false
                })

                pendingTextDelta = ''
                pendingReasoningDelta = ''
                lastUpdateTime = now
            }

            if (value.type === 'finish') {
                const usage = (value as any).usage || (value as any).totalUsage

                const apiTokens = usage?.completionTokens || 0
                const finalTokens = Math.max(apiTokens, Math.round(tokenCount))
                const duration = (now - (firstTokenTime || now)) / 1000
                const tps = duration > 0 ? finalTokens / duration : 0

                // Final metrics
                const finalMetrics = {
                    ttft: firstTokenTime
                        ? Math.round(firstTokenTime - start)
                        : 0,
                    tokenCount: finalTokens,
                    totalDuration: now - start,
                    tps: Math.round(tps * 100) / 100
                }

                // Send remaining delta if any (though loop logic covers it mainly,
                // but for 'finish' we want to ensure accurate metrics are sent one last time)
                self.postMessage({
                    type: 'update',
                    resultId,
                    textDelta: pendingTextDelta,
                    reasoningDelta: pendingReasoningDelta || undefined,
                    metrics: finalMetrics,
                    isFinal: true
                })
                pendingTextDelta = '' // clear
                pendingReasoningDelta = '' // clear
            }
        }

        self.postMessage({
            type: 'done',
            resultId
        })
    } catch (err: any) {
        self.postMessage({
            type: 'error',
            resultId,
            error: err.message || 'Unknown error in worker'
        })
    }
}
