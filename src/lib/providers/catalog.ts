import type { LLMModel, LLMProvider } from '@/lib/types'

export const PROVIDERS = {
    openrouter: {
        label: 'OpenRouter',
        baseURL: 'https://openrouter.ai/api/v1'
    },
    openai: { label: 'OpenAI', baseURL: 'https://api.openai.com/v1' },
    anthropic: { label: 'Anthropic', baseURL: 'https://api.anthropic.com/v1' },
    google: {
        label: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta'
    },
    deepseek: { label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1' },
    custom: { label: 'Custom (OpenAI Compatible)', baseURL: '' },
    other: { label: 'Custom (Legacy)', baseURL: '' }
} satisfies Record<LLMProvider, { label: string; baseURL: string }>

export const providerOptions = Object.entries(PROVIDERS)
    .filter(([value]) => value !== 'other')
    .map(([value, { label }]) => ({ value, label }))

export function getBaseURL(
    model: Pick<LLMModel, 'provider' | 'baseURL'>
): string {
    const value = model.baseURL?.trim() || PROVIDERS[model.provider].baseURL
    if (!value) throw new Error('A base URL is required for custom providers.')
    const url = new URL(value)
    if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password
    ) {
        throw new Error('Use an HTTP(S) base URL without embedded credentials.')
    }
    return url.href.replace(/\/$/, '')
}

export function providerLabel(
    model: Pick<LLMModel, 'provider' | 'providerName'>
) {
    return model.providerName?.trim() || PROVIDERS[model.provider].label
}

// Endpoints and labels distinguish separate services using the same protocol.
export function providerGroupKey(
    model: Pick<LLMModel, 'provider' | 'baseURL' | 'providerName'>
) {
    const endpoint =
        model.baseURL?.trim().replace(/\/$/, '') ||
        PROVIDERS[model.provider].baseURL
    return JSON.stringify([
        model.provider === 'other' ? 'custom' : model.provider,
        endpoint,
        model.providerName?.trim() || ''
    ])
}

export function modelIdentity(model: LLMModel) {
    return JSON.stringify([
        providerGroupKey(model),
        model.providerId || model.id,
        model.mode || 'chat'
    ])
}
