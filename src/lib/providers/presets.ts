import type { LLMModel, LLMProvider } from '@/lib/types'
import type { DiscoveredModel } from './discovery'
import snapshot from './model-presets.json'
import { getBaseURL } from './catalog'

export interface ModelPreset extends DiscoveredModel {
    contextWindow?: number
    outputLimit?: number
    aliases?: string[]
    pricingNote?: string
}
export const presetCatalogInfo = {
    source: snapshot.source,
    checkedAt: snapshot.checkedAt
}
const presets = snapshot.providers as Partial<
    Record<LLMProvider, ModelPreset[]>
>

export function getModelPresets(provider: LLMProvider): ModelPreset[] {
    return structuredClone(presets[provider] ?? [])
}

export function getModelPreset(provider: LLMProvider, modelId: string) {
    const preset = presets[provider]?.find(
        (entry) => entry.id === modelId || entry.aliases?.includes(modelId)
    )
    return preset ? structuredClone(preset) : undefined
}

/** Reference prices belong to the named service, not arbitrary proxy URLs. */
export function getReferenceModelPreset(model: Partial<LLMModel>) {
    if (!model.provider || model.mode === 'image') return undefined
    const id = model.providerId || model.id
    if (!id) return undefined
    try {
        const endpoint = getBaseURL({
            provider: model.provider,
            baseURL: model.baseURL
        })
        const official = getBaseURL({ provider: model.provider })
        const deepseekRoot =
            model.provider === 'deepseek' &&
            endpoint === 'https://api.deepseek.com'
        if (endpoint !== official && !deepseekRoot) return undefined
        return getModelPreset(model.provider, id)
    } catch {
        return undefined
    }
}

export function resolveModelPricing(model: Partial<LLMModel>) {
    return model.pricing
        ? { ...model.pricing }
        : getReferenceModelPreset(model)?.pricing
}

/** Explicit selection changes model defaults while preserving connection settings. */
export function applyModelPreset(
    value: Partial<LLMModel>,
    preset: ModelPreset
): Partial<LLMModel> {
    return {
        ...value,
        name: preset.name,
        providerId: preset.id,
        mode: preset.mode,
        decisionProtocol: preset.decisionProtocol,
        pricing: preset.pricing,
        capabilities: preset.capabilities,
        config:
            value.config || preset.config
                ? { ...value.config, ...preset.config }
                : undefined
    }
}

/** A different service uses its own endpoint, key, model and capabilities. */
export function changeModelProvider(
    value: Partial<LLMModel>,
    provider: LLMProvider
): Partial<LLMModel> {
    if (value.provider === provider) return value
    return {
        ...value,
        provider,
        baseURL: undefined,
        apiKey: undefined,
        providerName: undefined,
        providerId: provider === 'typesafe' ? 'jev-latest' : '',
        mode: provider === 'typesafe' ? 'decision' : 'chat',
        decisionProtocol: undefined,
        capabilities: undefined,
        pricing: undefined
    }
}
