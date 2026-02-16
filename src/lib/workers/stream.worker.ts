import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, type LanguageModel } from 'ai'
import { LLMModel } from '../types'
import {
    generateImage,
    buildImageResponse,
    extractPromptFromMessages
} from './imageGeneration'

const providerRegistry: Record<string, any> = {}
const providerKeys: string[] = []
const MAX_PROVIDERS = 20

function getProvider(model: LLMModel) {
    const providerKey = `${model.provider}:${model.providerId || 'default'}`

    if (providerRegistry[providerKey]) {
        const idx = providerKeys.indexOf(providerKey)
        if (idx > 0) {
            providerKeys.splice(idx, 1)
            providerKeys.unshift(providerKey)
        }
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

        if (providerKeys.length >= MAX_PROVIDERS) {
            const oldestKey = providerKeys.pop()
            if (oldestKey) {
                delete providerRegistry[oldestKey]
            }
        }
        providerKeys.unshift(providerKey)
        providerRegistry[providerKey] = provider
        return provider
    }

    throw new Error(`Provider ${model.provider} not supported yet`)
}

function processImageMarkers(messages: any[]): any[] {
    return messages.map((msg: any) => {
        if (
            msg.role === 'user' &&
            typeof msg.content === 'string' &&
            msg.content.includes('<<<<IMAGE_START>>>>')
        ) {
            const parts: any[] = []
            const regex = /<<<<IMAGE_START>>>>(.*?)<<<<IMAGE_END>>>>/gs
            let lastIndex = 0
            let match

            while ((match = regex.exec(msg.content)) !== null) {
                if (match.index > lastIndex) {
                    const text = msg.content.substring(lastIndex, match.index)
                    if (text.trim()) {
                        parts.push({ type: 'text', text })
                    }
                }
                parts.push({ type: 'image', image: match[1] })
                lastIndex = regex.lastIndex
            }

            if (lastIndex < msg.content.length) {
                const text = msg.content.substring(lastIndex)
                if (text.trim()) {
                    parts.push({ type: 'text', text })
                }
            }

            if (parts.length > 0) {
                return { ...msg, content: parts }
            }
        }
        return msg
    })
}

self.onmessage = async (e: MessageEvent) => {
    const { model, messages, resultId } = e.data

    try {
        if (model.mode === 'image') {
            self.postMessage({ type: 'start', resultId })

            const prompt = extractPromptFromMessages(messages)
            const start = performance.now()
            const { text, imageUrls } = await generateImage(model, prompt)
            const duration = performance.now() - start

            const responseContent = buildImageResponse(text, imageUrls)

            self.postMessage({
                type: 'update',
                resultId,
                textDelta: responseContent,
                metrics: {
                    ttft: duration,
                    tokenCount: 0,
                    totalDuration: duration,
                    tps: 0
                },
                isFinal: true
            })

            self.postMessage({ type: 'done', resultId })
            return
        }

        const providerFactory = getProvider(model)
        const languageModel: LanguageModel = providerFactory(
            model.providerId || model.id
        )

        const processedMessages = processImageMarkers(messages)

        const start = performance.now()
        let firstTokenTime: number | undefined
        let tokenCount = 0

        let pendingTextDelta = ''
        let pendingReasoningDelta = ''
        let lastUpdateTime = 0
        const BATCH_INTERVAL = 50

        self.postMessage({ type: 'start', resultId })

        const result = streamText({
            model: languageModel,
            messages: processedMessages,
            headers: model.apiKey
                ? { Authorization: `Bearer ${model.apiKey}` }
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
                }
            }

            if (value.type === 'text-delta') {
                const delta = value.text
                pendingTextDelta += delta

                const isCJK = /[\u4e00-\u9fa5]/.test(delta)
                if (isCJK) {
                    tokenCount += delta.length * 1.5
                } else {
                    tokenCount += Math.max(1, delta.length / 4)
                }
            }

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

                self.postMessage({
                    type: 'update',
                    resultId,
                    textDelta: pendingTextDelta,
                    reasoningDelta: pendingReasoningDelta || undefined,
                    metrics: {
                        ttft: firstTokenTime
                            ? Math.round(firstTokenTime - start)
                            : 0,
                        tokenCount: finalTokens,
                        totalDuration: now - start,
                        tps: Math.round(tps * 100) / 100
                    },
                    isFinal: true
                })
            }
        }

        self.postMessage({ type: 'done', resultId })
    } catch (err: any) {
        self.postMessage({
            type: 'error',
            resultId,
            error: err.message || 'Unknown error in worker'
        })
    }
}
