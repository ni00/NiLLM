import type { LanguageModel } from 'ai'
import type { LLMModel } from './types'
import { getBaseURL } from './providers/catalog'

type ModelFactory = (modelId: string) => Exclude<LanguageModel, string>
const providers = new Map<string, Promise<ModelFactory>>()
const MAX_PROVIDERS = 32

export function getProvider(model: LLMModel): Promise<ModelFactory> {
    const baseURL = getBaseURL(model)
    // Credentials and endpoint changes must never reuse a stale adapter.
    const key = JSON.stringify([model.provider, baseURL, model.apiKey || ''])
    const cached = providers.get(key)
    if (cached) {
        providers.delete(key)
        providers.set(key, cached)
        return cached
    }
    const provider = (async (): Promise<ModelFactory> => {
        const options = { baseURL, apiKey: model.apiKey || '' }
        if (model.provider === 'anthropic') {
            const { createAnthropic } = await import('@ai-sdk/anthropic')
            return createAnthropic({
                ...options,
                headers: { 'anthropic-dangerous-direct-browser-access': 'true' }
            })
        }
        if (model.provider === 'google') {
            const { createGoogle } = await import('@ai-sdk/google')
            return createGoogle(options)
        }
        const { createOpenAICompatible } =
            await import('@ai-sdk/openai-compatible')
        return createOpenAICompatible({
            ...options,
            name: model.provider === 'other' ? 'custom' : model.provider,
            headers:
                model.provider === 'openrouter'
                    ? {
                          'HTTP-Referer': 'https://github.com/ni00/nillm',
                          'X-Title': 'NiLLM'
                      }
                    : undefined
        })
    })()
    provider.catch(() => {
        if (providers.get(key) === provider) providers.delete(key)
    })
    providers.set(key, provider)
    if (providers.size > MAX_PROVIDERS)
        providers.delete(providers.keys().next().value!)
    return provider
}
