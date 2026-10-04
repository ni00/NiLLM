import { z } from 'zod'
import type { LLMModel } from '@/lib/types'
import { getBaseURL } from './catalog'

export type ProviderConnection = Pick<
    LLMModel,
    'provider' | 'baseURL' | 'apiKey' | 'providerName'
>
export interface DiscoveredModel {
    id: string
    name: string
    mode: 'chat' | 'image'
    pricing?: LLMModel['pricing']
}

const listedModel = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    display_name: z.string().optional(),
    pricing: z
        .object({ prompt: z.string(), completion: z.string() })
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
    const headers: Record<string, string> = {}
    if (connection.provider === 'anthropic') {
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
        const url = new URL(`${baseURL}/models`)
        if (connection.provider === 'google') {
            url.searchParams.set('pageSize', '1000')
            if (cursor) url.searchParams.set('pageToken', cursor)
        } else if (connection.provider === 'anthropic') {
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
        if (connection.provider === 'google') {
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
                const input = Number(model.pricing?.prompt) * 1e6
                const output = Number(model.pricing?.completion) * 1e6
                results.set(model.id, {
                    id: model.id,
                    name: model.name || model.display_name || model.id,
                    mode: model.architecture?.output_modalities?.includes(
                        'image'
                    )
                        ? 'image'
                        : 'chat',
                    pricing:
                        Number.isFinite(input) &&
                        input >= 0 &&
                        Number.isFinite(output) &&
                        output >= 0
                            ? { input, output }
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
            return [...results.values()].sort((a, b) =>
                a.name.localeCompare(b.name)
            )
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
