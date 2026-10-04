import type { LLMModel } from '@/lib/types'
import type {
    DiscoveredModel,
    ProviderConnection
} from '@/lib/providers/discovery'
import {
    modelIdentity,
    providerGroupKey,
    providerLabel
} from '@/lib/providers/catalog'

export { parseModels } from '@/lib/validation'

export function buildProviderModels(
    connection: ProviderConnection,
    catalog: DiscoveredModel[],
    existing: LLMModel[]
): LLMModel[] {
    const identities = new Set(existing.map(modelIdentity))
    const additions: LLMModel[] = []
    for (const entry of catalog) {
        const model: LLMModel = {
            ...connection,
            id: crypto.randomUUID(),
            providerId: entry.id,
            name: entry.name,
            enabled: true,
            mode: entry.mode,
            pricing: entry.pricing
        }
        const identity = modelIdentity(model)
        if (identities.has(identity)) continue
        identities.add(identity)
        additions.push(model)
    }
    return additions
}

export function groupModels(models: LLMModel[]) {
    const groups = new Map<
        string,
        { key: string; label: string; endpoint: string; models: LLMModel[] }
    >()
    for (const model of models) {
        const key = providerGroupKey(model)
        let group = groups.get(key)
        if (!group) {
            group = {
                key,
                label: providerLabel(model),
                endpoint: model.baseURL || '',
                models: []
            }
            groups.set(key, group)
        }
        group.models.push(model)
    }
    return [...groups.values()]
}
