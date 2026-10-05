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
    typesafe: {
        label: 'TypeSafe (Jev)',
        baseURL: 'https://api.typesafe.ai/v1'
    },
    vercel: {
        label: 'Vercel AI Gateway',
        baseURL: 'https://ai-gateway.vercel.sh/v1'
    },
    xai: { label: 'xAI', baseURL: 'https://api.x.ai/v1' },
    commandcode: {
        label: 'Command Code (GOAT)',
        baseURL: 'https://api.commandcode.ai/provider/v1'
    },
    zenmux: { label: 'ZenMux', baseURL: 'https://zenmux.ai/api/v1' },
    groq: { label: 'Groq', baseURL: 'https://api.groq.com/openai/v1' },
    mistral: { label: 'Mistral AI', baseURL: 'https://api.mistral.ai/v1' },
    togetherai: {
        label: 'Together AI',
        baseURL: 'https://api.together.xyz/v1'
    },
    fireworks: {
        label: 'Fireworks AI',
        baseURL: 'https://api.fireworks.ai/inference/v1'
    },
    cerebras: { label: 'Cerebras', baseURL: 'https://api.cerebras.ai/v1' },
    moonshot: {
        label: 'Moonshot AI (International)',
        baseURL: 'https://api.moonshot.ai/v1'
    },
    'moonshot-cn': {
        label: 'Moonshot AI (China)',
        baseURL: 'https://api.moonshot.cn/v1'
    },
    dashscope: {
        label: 'Alibaba DashScope (China)',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    },
    'dashscope-intl': {
        label: 'Alibaba DashScope (International)',
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    },
    siliconflow: {
        label: 'SiliconFlow (China)',
        baseURL: 'https://api.siliconflow.cn/v1'
    },
    'siliconflow-intl': {
        label: 'SiliconFlow (International)',
        baseURL: 'https://api.siliconflow.com/v1'
    },
    zai: { label: 'Z.AI', baseURL: 'https://api.z.ai/api/paas/v4' },
    zhipu: {
        label: 'Zhipu AI',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4'
    },
    'zai-coding': {
        label: 'Z.AI Coding Plan',
        baseURL: 'https://api.z.ai/api/coding/paas/v4'
    },
    'zhipu-coding': {
        label: 'Zhipu AI Coding Plan',
        baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4'
    },
    minimax: {
        label: 'MiniMax (International)',
        baseURL: 'https://api.minimax.io/anthropic/v1'
    },
    'minimax-cn': {
        label: 'MiniMax (China)',
        baseURL: 'https://api.minimax.cn/anthropic/v1'
    },
    nebius: {
        label: 'Nebius Token Factory',
        baseURL: 'https://api.tokenfactory.nebius.com/v1'
    },
    perplexity: { label: 'Perplexity', baseURL: 'https://api.perplexity.ai' },
    opencode: { label: 'OpenCode Zen', baseURL: 'https://opencode.ai/zen/v1' },
    'opencode-go': {
        label: 'OpenCode Go',
        baseURL: 'https://opencode.ai/zen/go/v1'
    },
    ollama: { label: 'Ollama (Local)', baseURL: 'http://localhost:11434/v1' },
    lmstudio: {
        label: 'LM Studio (Local)',
        baseURL: 'http://127.0.0.1:1234/v1'
    },
    custom: { label: 'Custom (OpenAI Compatible)', baseURL: '' },
    other: { label: 'Custom (Legacy)', baseURL: '' }
} satisfies Record<LLMProvider, { label: string; baseURL: string }>

export const providerOptions = Object.entries(PROVIDERS)
    .filter(([value]) => value !== 'other')
    .map(([value, { label }]) => ({ value, label }))

/** Named services may share a wire protocol without sharing credentials. */
export function providerProtocol(
    provider: LLMProvider,
    model?: Pick<LLMModel, 'id' | 'providerId' | 'capabilities'>
) {
    if (provider === 'commandcode') {
        if (model?.capabilities?.chatProtocol)
            return model.capabilities.chatProtocol
        if (
            /^(?:anthropic\/)?claude-/.test(
                model?.providerId || model?.id || ''
            )
        )
            return 'anthropic'
    }
    if (['anthropic', 'minimax', 'minimax-cn'].includes(provider))
        return 'anthropic'
    if (provider === 'google') return 'google'
    if (provider === 'typesafe') return 'system-one'
    return 'openai-compatible'
}

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
        model.mode || 'chat',
        ...(model.mode === 'decision' ? [model.decisionProtocol ?? 'auto'] : [])
    ])
}
