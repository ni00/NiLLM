import { readFile, writeFile } from 'node:fs/promises'

// Curated, supported chat APIs only; do not copy OAuth/deployment providers or
// model-specific Responses/Messages routes into an OpenAI-compatible gateway.
const selection = {
    openai: ['openai', ['gpt-4.1', 'gpt-4.1-mini']],
    anthropic: [
        'anthropic',
        ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-6']
    ],
    google: ['google', ['gemini-2.5-flash', 'gemini-2.5-pro']],
    deepseek: ['deepseek', ['deepseek-v4-flash', 'deepseek-v4-pro']],
    openrouter: ['openrouter', ['openai/gpt-4.1-mini', 'moonshotai/kimi-k2.6']],
    vercel: ['vercel', ['openai/gpt-4.1-mini', 'moonshotai/kimi-k2.6']],
    zenmux: ['zenmux', ['moonshotai/kimi-k2.6', 'anthropic/claude-sonnet-4.6']],
    xai: ['xai', ['grok-4.6', 'grok-4.20-0309-non-reasoning']],
    groq: ['groq', ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b']],
    mistral: [
        'mistral',
        ['mistral-small-latest', 'mistral-medium-latest', 'codestral-latest']
    ],
    togetherai: [
        'togetherai',
        ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'openai/gpt-oss-120b']
    ],
    fireworks: [
        'fireworks-ai',
        [
            'accounts/fireworks/models/gpt-oss-120b',
            'accounts/fireworks/models/kimi-k3'
        ]
    ],
    cerebras: ['cerebras', ['gpt-oss-120b', 'qwen-3.8-27b']],
    moonshot: ['moonshotai', ['kimi-k3', 'kimi-k2.6']],
    'moonshot-cn': ['moonshotai-cn', ['kimi-k3', 'kimi-k2.6']],
    dashscope: ['alibaba-cn', ['qwen-plus', 'qwen-flash', 'qwen3-max']],
    'dashscope-intl': ['alibaba', ['qwen-plus', 'qwen-flash', 'qwen3-max']],
    siliconflow: [
        'siliconflow-cn',
        ['Qwen/Qwen3-8B', 'Qwen/Qwen3-Coder-30B-A3B-Instruct']
    ],
    'siliconflow-intl': [
        'siliconflow',
        ['deepseek-ai/DeepSeek-V3.2', 'zai-org/GLM-5.3']
    ],
    zai: ['zai', ['glm-5.3', 'glm-4.7-flash']],
    zhipu: ['zhipuai', ['glm-5.3', 'glm-4.7-flash']],
    'zai-coding': ['zai-coding-plan', ['glm-5.3', 'glm-5.3-flash']],
    'zhipu-coding': ['zhipuai-coding-plan', ['glm-5.3', 'glm-5.3-flash']],
    minimax: ['minimax', ['MiniMax-M2.7', 'MiniMax-M2.5']],
    'minimax-cn': ['minimax-cn', ['MiniMax-M2.7', 'MiniMax-M2.5']],
    nebius: ['nebius', ['openai/gpt-oss-120b']],
    perplexity: ['perplexity', ['sonar', 'sonar-pro']],
    opencode: ['opencode', ['kimi-k2.6', 'glm-5.3']],
    'opencode-go': ['opencode-go', ['kimi-k2.6', 'glm-5.3']],
    lmstudio: ['lmstudio', ['qwen/qwen3-coder-30b', 'openai/gpt-oss-20b']]
}

const source = 'https://models.dev/api.json'
const catalog = process.argv[2]
    ? JSON.parse(await readFile(process.argv[2], 'utf8'))
    : await (async () => {
          const response = await fetch(source, {
              signal: AbortSignal.timeout(30000)
          })
          if (!response.ok)
              throw new Error(`Model catalog HTTP ${response.status}`)
          return response.json()
      })()
const providers = {}
for (const [provider, [catalogId, ids]] of Object.entries(selection)) {
    providers[provider] = ids.map((id) => {
        const model = catalog[catalogId]?.models?.[id]
        if (!model)
            throw new Error(`Missing selected model: ${catalogId}/${id}`)
        if (!model.modalities?.output?.includes('text'))
            throw new Error(
                `Selected model is not a chat model: ${catalogId}/${id}`
            )
        if (
            ['opencode', 'opencode-go'].includes(provider) &&
            model.provider?.npm
        )
            throw new Error(
                `Model requires a dedicated API route: ${provider}/${id}`
            )
        const unsupportedParameters =
            model.temperature === false ? ['temperature'] : []
        if (['anthropic', 'minimax', 'minimax-cn'].includes(provider))
            unsupportedParameters.push(
                'frequencyPenalty',
                'presencePenalty',
                'repetitionPenalty',
                'seed',
                'minP'
            )
        const cost = model.cost
        const pricing =
            Number.isFinite(cost?.input) &&
            cost.input >= 0 &&
            Number.isFinite(cost?.output) &&
            cost.output >= 0 &&
            (cost.input > 0 || cost.output > 0)
                ? {
                      input: cost.input,
                      output: cost.output,
                      ...(Number.isFinite(cost.cache_read) &&
                          cost.cache_read >= 0 && {
                              cacheRead: cost.cache_read
                          }),
                      ...(Number.isFinite(cost.cache_write) &&
                          cost.cache_write >= 0 && {
                              cacheWrite: cost.cache_write
                          })
                  }
                : undefined
        return {
            id,
            name: model.name || id,
            mode: 'chat',
            config: { maxTokens: Math.min(4096, model.limit?.output || 4096) },
            capabilities: {
                vision: model.modalities.input.includes('image'),
                unsupportedParameters
            },
            pricing,
            contextWindow: model.limit?.context || undefined,
            outputLimit: model.limit?.output || undefined
        }
    })
}
const jev = (id) => ({
    id,
    name: 'Jev (System One)',
    mode: 'decision',
    decisionProtocol: 'system-one'
})
for (const preset of providers.deepseek) {
    if (preset.id === 'deepseek-v4-flash') {
        preset.id = 'deepseek-flash'
        preset.name = 'DeepSeek V4.1 Flash'
        preset.aliases = ['deepseek-v4-flash', 'deepseek-v4-flash-vision-exp']
    }
    preset.pricingNote =
        'DeepSeek pricing varies between peak and off-peak hours; actual billing may differ.'
}
providers.typesafe = [jev('jev-latest')]
providers.openrouter.push(jev('typesafe/jev-1.13'))
providers.vercel.push(jev('typesafe-ai/jev'))
// Fetch ZenMux prices online: tiered rates and cache TTLs cannot be represented
// by a single bundled price. Never fall back to a stale flat rate after discovery.
for (const preset of providers.zenmux) {
    delete preset.pricing
    preset.pricingNote =
        'Fetch live models for current prices; tiered rates require provider billing or explicit pricing.'
}
providers.zenmux.push(jev('typesafe/jev-latest'))
providers.commandcode = [
    {
        id: 'deepseek/deepseek-v4.1-flash',
        name: 'DeepSeek V4.1 Flash',
        mode: 'chat',
        config: { maxTokens: 4096 },
        capabilities: { chatProtocol: 'openai-compatible' },
        contextWindow: 1000000
    },
    {
        id: 'z-ai/glm-5.3-flash',
        name: 'GLM-5.3 Flash',
        mode: 'chat',
        config: { maxTokens: 4096 },
        capabilities: { chatProtocol: 'openai-compatible' },
        contextWindow: 1048576
    },
    {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        mode: 'chat',
        config: { maxTokens: 4096 },
        capabilities: {
            chatProtocol: 'anthropic',
            vision: true,
            unsupportedParameters: [
                'frequencyPenalty',
                'presencePenalty',
                'repetitionPenalty',
                'seed',
                'minP'
            ]
        },
        contextWindow: 1000000
    },
    jev('typesafe/jev')
]
// Local tags are starter suggestions: the model must first be installed.
providers.ollama = [
    {
        id: 'qwen3:8b',
        name: 'Qwen3 8B',
        mode: 'chat',
        config: { maxTokens: 4096 }
    }
]
const snapshot = {
    source,
    checkedAt: new Date().toISOString().slice(0, 10),
    additionalSources: [
        'https://api-docs.deepseek.com/quick_start/pricing/',
        'https://openrouter.ai/docs/guides/community/typesafe-sdk',
        'https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe',
        'https://commandcode.ai/docs/provider',
        'https://zenmux.ai/docs/api/openai/openai-list-models.html',
        'https://zenmux.ai/docs/api/typesafe/systemone.html',
        'https://ollama.com/library/qwen3'
    ],
    providers
}
await writeFile(
    new URL('../src/lib/providers/model-presets.json', import.meta.url),
    JSON.stringify(snapshot, null, 4) + '\n'
)
console.log(
    `Updated ${Object.keys(providers).length} providers / ${Object.values(providers).flat().length} model presets.`
)
