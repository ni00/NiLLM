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

// Resolve the base URL for a model's provider
function getBaseURL(model: LLMModel): string {
    if (model.baseURL) return model.baseURL
    const providerType = model.provider as string
    if (providerType === 'openrouter') return 'https://openrouter.ai/api/v1'
    if (providerType === 'openai') return 'https://api.openai.com/v1'
    throw new Error(`BaseURL is required for ${providerType} provider`)
}

// Direct fetch for image generation models.
// OpenRouter image models (flux, seedream, etc.) use the chat completions
// endpoint and return images in the response content as base64 data URLs.
// The AI SDK's generateText/streamText doesn't parse the image response
// format correctly, so we need to handle the raw API response ourselves.
async function generateImageViaFetch(
    model: LLMModel,
    prompt: string
): Promise<{ text: string; imageUrls: string[] }> {
    const baseURL = getBaseURL(model)
    const url = `${baseURL}/chat/completions`

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    }

    if (model.apiKey) {
        headers['Authorization'] = `Bearer ${model.apiKey}`
    }

    if (model.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://github.com/ni00/nillm'
        headers['X-Title'] = 'NiLLM'
    }

    const body: any = {
        model: model.providerId || model.id,
        messages: [{ role: 'user', content: prompt }]
    }

    const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    })

    if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(`Image generation failed (${resp.status}): ${errText}`)
    }

    const data = await resp.json()

    // Extract image data from response — OpenRouter returns images
    // in various locations depending on the model
    const imageUrls: string[] = []
    let text = ''

    if (data.choices && data.choices.length > 0) {
        const message = data.choices[0].message || data.choices[0].delta || {}

        // Case 1: content is a string (may contain markdown image or data URL)
        if (typeof message.content === 'string') {
            text = message.content
        }

        // Case 2: content is an array of parts (multimodal response)
        if (Array.isArray(message.content)) {
            for (const part of message.content) {
                if (part.type === 'text') {
                    text += part.text || ''
                } else if (part.type === 'image_url') {
                    const imgUrl = part.image_url?.url || ''
                    if (imgUrl) imageUrls.push(imgUrl)
                }
            }
        }

        // Case 3: images array on the message (some OpenRouter models)
        if (Array.isArray(message.images)) {
            for (const img of message.images) {
                const imgUrl =
                    img?.imageUrl?.url || img?.url || img?.image_url?.url || ''
                if (imgUrl) imageUrls.push(imgUrl)
            }
        }
    }

    // Also check top-level data field for images
    if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
            if (item.b64_json) {
                imageUrls.push(`data:image/png;base64,${item.b64_json}`)
            } else if (item.url) {
                imageUrls.push(item.url)
            }
        }
    }

    return { text, imageUrls }
}

self.onmessage = async (e: MessageEvent) => {
    const { model, messages, resultId } = e.data

    try {
        if (model.mode === 'image') {
            self.postMessage({ type: 'start', resultId })

            // For image models, extract only the last user message as the prompt
            const lastMessage = messages[messages.length - 1]
            let prompt =
                typeof lastMessage.content === 'string'
                    ? lastMessage.content
                    : ''
            prompt = prompt
                .replace(/<<<<IMAGE_START>>>>.*?<<<<IMAGE_END>>>>/gs, '')
                .trim()

            if (!prompt) {
                prompt = 'Generate an image'
            }

            const start = performance.now()
            const { text, imageUrls } = await generateImageViaFetch(
                model,
                prompt
            )
            const duration = performance.now() - start

            // Build response content
            let responseContent = text || ''

            // Append images as markdown
            for (const url of imageUrls) {
                responseContent += `\n\n![Generated Image](${url})`
            }

            // If text already contains image markdown (data:image), don't append fallback
            const hasImageData =
                responseContent.includes('data:image') ||
                responseContent.includes('![')

            if (
                !responseContent.trim() ||
                (!hasImageData && !responseContent.trim())
            ) {
                responseContent =
                    responseContent || '[No image data returned by model]'
            }

            self.postMessage({
                type: 'update',
                resultId,
                textDelta: responseContent.trim(),
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

        // Pre-process messages to handle image markers
        const processedMessages = messages.map((msg: any) => {
            if (
                msg.role === 'user' &&
                typeof msg.content === 'string' &&
                msg.content.includes('<<<<IMAGE_START>>>>')
            ) {
                console.log('Worker: Found image marker, processing...')
                const parts: any[] = []
                const regex = /<<<<IMAGE_START>>>>(.*?)<<<<IMAGE_END>>>>/gs
                let lastIndex = 0
                let match

                while ((match = regex.exec(msg.content)) !== null) {
                    // Add preceding text
                    if (match.index > lastIndex) {
                        const text = msg.content.substring(
                            lastIndex,
                            match.index
                        )
                        if (text.trim()) {
                            parts.push({ type: 'text', text })
                        }
                    }
                    // Add image
                    console.log(
                        'Worker: Extracted image data length:',
                        match[1].length
                    )
                    parts.push({ type: 'image', image: match[1] })
                    lastIndex = regex.lastIndex
                }

                // Add remaining text
                if (lastIndex < msg.content.length) {
                    const text = msg.content.substring(lastIndex)
                    if (text.trim()) {
                        parts.push({ type: 'text', text })
                    }
                }

                if (parts.length > 0) {
                    console.log(
                        'Worker: Finished processing image message. Parts:',
                        parts.length
                    )
                    return { ...msg, content: parts }
                }
            }
            return msg
        })

        console.log('Worker: Starting streamText request...')

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
            messages: processedMessages,
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
