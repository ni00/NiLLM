import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, type LanguageModel } from 'ai'
import { LLMModel } from './types'

// Registry of provider instances to avoid recreation
const providerRegistry: Record<string, any> = {}

export function getProvider(model: LLMModel) {
    const providerKey = `${model.provider}:${model.providerId || 'default'}`

    if (providerRegistry[providerKey]) {
        return providerRegistry[providerKey]
    }

    // Cast provider to string to avoid distinct union type issues if they don't overlap perfectly
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
                          'HTTP-Referer': 'https://github.com/ni00/nillm', // Should be configurable
                          'X-Title': 'NiLLM'
                      }
                    : undefined
        })

        providerRegistry[providerKey] = provider
        return provider
    }

    throw new Error(`Provider ${model.provider} not supported yet`)
}

export async function streamResponse(
    model: LLMModel,
    messages: any[],
    onMetrics: (metrics: {
        ttft?: number
        tps?: number
        tokens?: number
    }) => void
) {
    const providerFactory = getProvider(model)
    const languageModel: LanguageModel = providerFactory(
        model.providerId || model.id
    )

    const start = performance.now()
    let firstTokenTime: number | undefined
    let tokenCount = 0

    const result = streamText({
        model: languageModel,
        messages,
        headers: model.apiKey
            ? {
                  Authorization: `Bearer ${model.apiKey}`
              }
            : undefined
    })

    const fullStream = result.fullStream
    let firstTokenReceived = false

    const reader = fullStream.getReader()

    const wrappedStream = new ReadableStream({
        async start(controller) {
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    if (!firstTokenReceived && value.type === 'text-delta') {
                        const now = performance.now()
                        firstTokenReceived = true
                        firstTokenTime = now
                        onMetrics({ ttft: Math.round(now - start) })
                    }

                    if (value.type === 'text-delta') {
                        tokenCount++
                    }

                    if (value.type === 'finish') {
                        const now = performance.now()
                        const duration = (now - (firstTokenTime || now)) / 1000
                        // Use totalUsage if available, otherwise fallback to tokenCount
                        const usage =
                            (value as any).usage || (value as any).totalUsage
                        const tokens = usage?.completionTokens || tokenCount
                        const tps = duration > 0 ? tokens / duration : 0
                        onMetrics({ tps: Math.round(tps * 100) / 100, tokens })
                    }

                    controller.enqueue(value)
                }
                controller.close()
            } catch (err) {
                controller.error(err)
            }
        }
    })

    return { ...result, fullStream: wrappedStream }
}
