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
        inputTokens?: number
        outputTokens?: number
    }) => void,
    abortSignal?: AbortSignal
) {
    const providerFactory = getProvider(model)
    const languageModel: LanguageModel = providerFactory(
        model.providerId || model.id
    )

    const start = performance.now()
    let firstTokenTime: number | undefined
    let tokenCount = 0
    let finalInputTokens: number | undefined
    let finalOutputTokens: number | undefined

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
        timeout: model.config?.timeout
            ? {
                  totalMs: model.config.timeout.totalMs,
                  stepMs: model.config.timeout.stepMs,
                  chunkMs: model.config.timeout.chunkMs
              }
            : undefined,
        abortSignal,
        providerOptions: {
            openai: {
                ...(model.config?.minP !== undefined
                    ? { min_p: model.config.minP }
                    : {}),
                ...(model.config?.repetitionPenalty !== undefined
                    ? { repetition_penalty: model.config.repetitionPenalty }
                    : {})
            }
        },
        onStepFinish: ({ usage }) => {
            if (usage?.outputTokens) {
                tokenCount = Math.max(tokenCount, usage.outputTokens)
            }
        },
        onFinish: ({ usage }) => {
            finalInputTokens = usage?.inputTokens
            finalOutputTokens = usage?.outputTokens
        },
        ...(model.config?.telemetry?.isEnabled && {
            experimental_telemetry: {
                isEnabled: true,
                functionId: model.config.telemetry.functionId || 'nillm-stream',
                recordInputs: model.config.telemetry.recordInputs,
                recordOutputs: model.config.telemetry.recordOutputs,
                metadata: model.config.telemetry.metadata
            }
        })
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
                        const delta = value.text
                        // Update our local count based on length as a heuristic since we don't have a tokenizer here
                        const isCJK = /[\u4e00-\u9fa5]/.test(delta)
                        if (isCJK) {
                            tokenCount += delta.length * 1.5 // CJK chars generally use more tokens (approx 1.5 per char)
                        } else {
                            // English: simple word count or group of chars
                            tokenCount += Math.max(1, delta.length / 4)
                        }

                        onMetrics({
                            tokens: Math.round(tokenCount)
                        })
                    }

                    if (value.type === 'finish') {
                        const now = performance.now()
                        const duration = (now - (firstTokenTime || now)) / 1000
                        const finishValue = value as {
                            usage?: {
                                completionTokens?: number
                                outputTokens?: number
                            }
                            totalUsage?: {
                                completionTokens?: number
                                outputTokens?: number
                            }
                        }
                        const usage =
                            finishValue.usage || finishValue.totalUsage
                        const apiTokens =
                            finalOutputTokens ||
                            usage?.outputTokens ||
                            usage?.completionTokens ||
                            0
                        const finalTokens = Math.max(
                            apiTokens,
                            Math.round(tokenCount)
                        )
                        const tps = duration > 0 ? finalTokens / duration : 0

                        onMetrics({
                            tps: Math.round(tps * 100) / 100,
                            tokens: finalTokens,
                            inputTokens: finalInputTokens,
                            outputTokens: finalOutputTokens
                        })
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
