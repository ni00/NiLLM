import type { GenerationConfigPatch, LLMProvider } from '@/lib/types'

/** `createOpenAICompatible` reads options under the camelCase form of the
 * adapter name, so hyphenated provider ids must be normalized to match. */
export function providerOptionsKey(provider: LLMProvider) {
    return (provider === 'other' ? 'custom' : provider).replace(
        /[_-]([a-z])/g,
        (match) => match[1].toUpperCase()
    )
}

/** Sampling parameters that only OpenAI-compatible endpoints accept, keyed for
 * `providerOptions`. Empty when the configuration carries neither. */
export function samplingProviderOptions(
    config: GenerationConfigPatch | undefined
) {
    return {
        ...(config?.minP !== undefined ? { min_p: config.minP } : {}),
        ...(config?.repetitionPenalty !== undefined
            ? { repetition_penalty: config.repetitionPenalty }
            : {})
    }
}
