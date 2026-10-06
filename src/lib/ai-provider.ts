import {
    defaultSettingsMiddleware,
    wrapLanguageModel,
    type LanguageModel
} from 'ai'
import type { LLMModel } from './types'
import { getBaseURL, providerProtocol } from './providers/catalog'
import { resolveDecisionProtocol } from './providers/decisions'
import { providerFetch } from './providers/transport'

type ModelFactory = (modelId: string) => Exclude<LanguageModel, string>
const providers = new Map<string, Promise<ModelFactory>>()
const MAX_PROVIDERS = 32

export function getProvider(model: LLMModel): Promise<ModelFactory> {
    if (
        model.provider === 'typesafe' ||
        (model.mode === 'decision' &&
            resolveDecisionProtocol(model) !== 'structured')
    )
        throw new Error('This decision protocol requires its native adapter.')
    const baseURL = getBaseURL(model)
    const protocol = providerProtocol(model.provider, model)
    // Credentials and endpoint changes must never reuse a stale adapter.
    const supportsStructuredOutputs =
        model.provider === 'openai' && model.mode === 'decision'
    const key = JSON.stringify([
        model.provider,
        protocol,
        baseURL,
        model.apiKey || '',
        supportsStructuredOutputs
    ])
    const cached = providers.get(key)
    if (cached) {
        providers.delete(key)
        providers.set(key, cached)
        return cached
    }
    const provider = (async (): Promise<ModelFactory> => {
        const options = {
            baseURL,
            apiKey: model.apiKey || '',
            fetch: providerFetch
        }
        if (protocol === 'openai-responses') {
            const { createOpenAI } = await import('@ai-sdk/openai')
            const provider = createOpenAI(options)
            return (modelId) =>
                wrapLanguageModel({
                    model: provider.responses(modelId),
                    middleware: defaultSettingsMiddleware({
                        // NiLLM sends complete local conversation history each turn.
                        settings: {
                            providerOptions: { openai: { store: false } }
                        }
                    })
                })
        }
        if (protocol === 'anthropic') {
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
            supportsStructuredOutputs,
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
