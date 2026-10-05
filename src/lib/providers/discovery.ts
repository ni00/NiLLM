import { z } from 'zod'
import type { LLMModel } from '@/lib/types'
import { getBaseURL, providerProtocol } from './catalog'
import { getModelPresets } from './presets'
import { nonnegativeNumber } from '@/lib/usage'

const perMillion = (value: string | undefined) => {
    if (value === undefined || value.trim() === '') return undefined
    return nonnegativeNumber(Number(value) * 1e6)
}

export type ProviderConnection = Pick<
    LLMModel,
    'provider' | 'baseURL' | 'apiKey' | 'providerName'
>
export interface DiscoveredModel {
    id: string
    name: string
    mode: 'chat' | 'image' | 'decision'
    decisionProtocol?: LLMModel['decisionProtocol']
    pricing?: LLMModel['pricing']
    config?: LLMModel['config']
    capabilities?: LLMModel['capabilities']
}

const gatewayRate = z.object({
    value: z.number().finite().nonnegative(),
    currency: z.string(),
    unit: z.string(),
    conditions: z.unknown().optional()
})
const gatewayPrices = z.record(z.string(), z.array(gatewayRate))

function flatGatewayRate(rates: z.infer<typeof gatewayRate>[] | undefined) {
    const rate = rates?.length === 1 ? rates[0] : undefined
    return rate &&
        rate.currency === 'USD' &&
        rate.unit === 'perMTokens' &&
        (rate.conditions === undefined || rate.conditions === null)
        ? rate.value
        : undefined
}

function gatewayPricing(prices: z.infer<typeof gatewayPrices> | undefined) {
    const input = flatGatewayRate(prices?.prompt)
    const output = flatGatewayRate(prices?.completion)
    if (input === undefined || output === undefined) return undefined
    const cacheRead = flatGatewayRate(prices?.input_cache_read)
    const writeKeys = Object.keys(prices ?? {}).filter((key) =>
        key.startsWith('input_cache_write')
    )
    const cacheWrite =
        writeKeys.length === 1
            ? flatGatewayRate(prices?.[writeKeys[0]])
            : undefined
    // A cache tier or TTL that cannot be represented must not become an ordinary input price.
    if (
        (prices?.input_cache_read?.length && cacheRead === undefined) ||
        (writeKeys.length && cacheWrite === undefined)
    )
        return undefined
    return {
        input,
        output,
        ...(cacheRead !== undefined && { cacheRead }),
        ...(cacheWrite !== undefined && { cacheWrite })
    }
}

const listedModel = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    display_name: z.string().optional(),
    type: z.string().optional(),
    supported_endpoints: z.array(z.string()).optional(),
    input_modalities: z.array(z.string()).optional(),
    output_modalities: z.array(z.string()).optional(),
    pricings: gatewayPrices.optional(),
    pricing: z
        .object({
            prompt: z.string().optional(),
            completion: z.string().optional(),
            input: z.string().optional(),
            output: z.string().optional(),
            input_cache_read: z.string().optional(),
            input_cache_write: z.string().optional()
        })
        .optional(),
    architecture: z
        .object({ output_modalities: z.array(z.string()).optional() })
        .optional()
})
const compatiblePage = z.object({
    data: z.array(listedModel),
    has_more: z.boolean().optional(),
    last_id: z.string().optional()
})
const googlePage = z.object({
    models: z
        .array(
            z.object({
                name: z.string(),
                displayName: z.string().optional(),
                supportedGenerationMethods: z.array(z.string()).optional()
            })
        )
        .default([]),
    nextPageToken: z.string().optional()
})

export async function discoverModels(
    connection: ProviderConnection,
    signal?: AbortSignal
): Promise<DiscoveredModel[]> {
    const baseURL = getBaseURL(connection)
    const knownPresets =
        !['custom', 'other'].includes(connection.provider) &&
        baseURL === getBaseURL({ provider: connection.provider })
            ? new Map(
                  getModelPresets(connection.provider).flatMap((preset) =>
                      [preset.id, ...(preset.aliases ?? [])].map(
                          (id) => [id, preset] as const
                      )
                  )
              )
            : new Map<string, DiscoveredModel>()
    const headers: Record<string, string> = {}
    if (providerProtocol(connection.provider) === 'anthropic') {
        headers['x-api-key'] = connection.apiKey || ''
        headers['anthropic-version'] = '2023-06-01'
        headers['anthropic-dangerous-direct-browser-access'] = 'true'
    } else if (connection.provider === 'google') {
        headers['x-goog-api-key'] = connection.apiKey || ''
    } else if (connection.apiKey) {
        headers.Authorization = `Bearer ${connection.apiKey}`
    }
    const requestSignal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000)
    const results = new Map<string, DiscoveredModel>()
    const cursors = new Set<string>()
    let cursor = ''
    for (let page = 0; page < 100; page++) {
        const url = new URL(baseURL)
        url.pathname = `${url.pathname.replace(/\/$/, '')}/models`
        if (connection.provider === 'openrouter')
            url.searchParams.set('output_modalities', 'text,image,decisions')
        if (connection.provider === 'google') {
            url.searchParams.set('pageSize', '1000')
            if (cursor) url.searchParams.set('pageToken', cursor)
        } else if (providerProtocol(connection.provider) === 'anthropic') {
            url.searchParams.set('limit', '1000')
            if (cursor) url.searchParams.set('after_id', cursor)
        } else if (cursor) url.searchParams.set('after', cursor)
        const response = await fetch(url, { headers, signal: requestSignal })
        // Provider error bodies may contain credentials. Keep diagnostics to status.
        if (!response.ok)
            throw new Error(
                `Could not fetch models (HTTP ${response.status}). Check the endpoint and API key.`
            )
        const json: unknown = await response.json()
        if (connection.provider === 'typesafe') {
            const data = z
                .object({
                    models: z.array(z.object({ name: z.string().min(1) }))
                })
                .parse(json)
            return data.models.map((model) => ({
                id: model.name,
                name: model.name,
                mode: 'decision' as const,
                decisionProtocol: 'system-one' as const
            }))
        } else if (connection.provider === 'google') {
            const data = googlePage.parse(json)
            for (const model of data.models) {
                if (
                    !model.supportedGenerationMethods?.includes(
                        'generateContent'
                    )
                )
                    continue
                const id = model.name.replace(/^models\//, '')
                results.set(id, {
                    id,
                    name: model.displayName || id,
                    mode: 'chat'
                })
            }
            cursor = data.nextPageToken || ''
        } else {
            const data = compatiblePage.parse(json)
            for (const model of data.data) {
                const modalities =
                    model.output_modalities ??
                    model.architecture?.output_modalities
                const endpoints = model.supported_endpoints
                if (
                    connection.provider === 'zenmux' &&
                    modalities &&
                    !modalities.some((value) =>
                        ['text', 'image', 'decisions'].includes(value)
                    )
                )
                    continue
                if (
                    connection.provider === 'commandcode' &&
                    endpoints &&
                    !endpoints.some((value) =>
                        [
                            '/chat/completions',
                            '/messages',
                            '/systemone'
                        ].includes(value)
                    )
                )
                    continue
                if (
                    connection.provider === 'vercel' &&
                    model.type &&
                    !['language', 'image', 'evaluation'].includes(model.type)
                )
                    continue
                const input = perMillion(
                    model.pricing?.prompt ?? model.pricing?.input
                )
                const output = perMillion(
                    model.pricing?.completion ?? model.pricing?.output
                )
                const cacheRead = perMillion(model.pricing?.input_cache_read)
                const cacheWrite = perMillion(model.pricing?.input_cache_write)
                const nativeDecision =
                    model.type === 'evaluation' ||
                    modalities?.includes('decisions') ||
                    (connection.provider === 'commandcode' &&
                        (model.id === 'typesafe/jev' ||
                            endpoints?.includes('/systemone'))) ||
                    (connection.provider === 'zenmux' &&
                        model.id === 'typesafe/jev-latest')
                results.set(model.id, {
                    id: model.id,
                    name: model.name || model.display_name || model.id,
                    mode: nativeDecision
                        ? 'decision'
                        : model.type === 'image' ||
                            modalities?.includes('image')
                          ? 'image'
                          : 'chat',
                    ...(nativeDecision && {
                        decisionProtocol: 'system-one' as const
                    }),
                    capabilities:
                        connection.provider === 'commandcode' &&
                        endpoints &&
                        !nativeDecision
                            ? {
                                  chatProtocol: endpoints.includes(
                                      '/chat/completions'
                                  )
                                      ? 'openai-compatible'
                                      : 'anthropic'
                              }
                            : connection.provider === 'zenmux' &&
                                model.input_modalities
                              ? {
                                    vision: model.input_modalities.includes(
                                        'image'
                                    )
                                }
                              : undefined,
                    pricing:
                        connection.provider === 'zenmux'
                            ? gatewayPricing(model.pricings)
                            : input !== undefined && output !== undefined
                              ? {
                                    input,
                                    output,
                                    ...(cacheRead !== undefined && {
                                        cacheRead
                                    }),
                                    ...(cacheWrite !== undefined && {
                                        cacheWrite
                                    })
                                }
                              : undefined
                })
            }
            cursor = data.has_more
                ? data.last_id || data.data.at(-1)?.id || ''
                : ''
            if (data.has_more && !cursor)
                throw new Error('Model list pagination is incomplete.')
        }
        if (!cursor)
            return [...results.values()]
                .map((entry) => {
                    const preset = knownPresets.get(entry.id)
                    return preset && preset.mode === entry.mode
                        ? {
                              ...entry,
                              config: preset.config,
                              capabilities:
                                  preset.capabilities || entry.capabilities
                                      ? {
                                            ...preset.capabilities,
                                            ...entry.capabilities
                                        }
                                      : undefined,
                              pricing: entry.pricing ?? preset.pricing
                          }
                        : entry
                })
                .sort((a, b) => a.name.localeCompare(b.name))
        if (cursors.has(cursor))
            throw new Error(
                'The provider returned a repeated pagination cursor.'
            )
        cursors.add(cursor)
    }
    throw new Error(
        'Model list exceeds the pagination limit. No models were imported.'
    )
}
