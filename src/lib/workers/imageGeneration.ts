import { LLMModel } from '../types'

function getBaseURL(model: LLMModel): string {
    if (model.baseURL) return model.baseURL
    const providerType = model.provider as string
    if (providerType === 'openrouter') return 'https://openrouter.ai/api/v1'
    if (providerType === 'openai') return 'https://api.openai.com/v1'
    throw new Error(`BaseURL is required for ${providerType} provider`)
}

export async function generateImage(
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

    const body = {
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

    const imageUrls: string[] = []
    let text = ''

    if (data.choices && data.choices.length > 0) {
        const message = data.choices[0].message || data.choices[0].delta || {}

        if (typeof message.content === 'string') {
            text = message.content
        }

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

        if (Array.isArray(message.images)) {
            for (const img of message.images) {
                const imgUrl =
                    img?.imageUrl?.url || img?.url || img?.image_url?.url || ''
                if (imgUrl) imageUrls.push(imgUrl)
            }
        }
    }

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

export function buildImageResponse(text: string, imageUrls: string[]): string {
    let responseContent = text || ''

    for (const url of imageUrls) {
        responseContent += `\n\n![Generated Image](${url})`
    }

    const hasImageData =
        responseContent.includes('data:image') || responseContent.includes('![')

    if (!responseContent.trim() || (!hasImageData && !responseContent.trim())) {
        responseContent = responseContent || '[No image data returned by model]'
    }

    return responseContent.trim()
}

export function extractPromptFromMessages(messages: any[]): string {
    const lastMessage = messages[messages.length - 1]
    let prompt =
        typeof lastMessage.content === 'string' ? lastMessage.content : ''
    prompt = prompt
        .replace(/<<<<IMAGE_START>>>>.*?<<<<IMAGE_END>>>>/gs, '')
        .trim()

    if (!prompt) {
        prompt = 'Generate an image'
    }

    return prompt
}
