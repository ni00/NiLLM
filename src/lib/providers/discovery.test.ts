import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverModels } from './discovery'
import { modelSchema } from '@/lib/validation'
import { model } from '@/test/fixtures'
afterEach(() => vi.unstubAllGlobals())
const response = (data: unknown) =>
    new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    })
describe('model discovery', () => {
    it('preserves Go model protocols in imported and persisted models', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                response({
                    data: [
                        { id: 'gpt-6-luna' },
                        { id: 'grok-4.7' },
                        { id: 'muse-spark-1.3-contributor' },
                        { id: 'minimax-m3' },
                        { id: 'qwen3.8-flash' },
                        { id: 'hy4-preview' },
                        { id: 'kimi-k2.6' }
                    ]
                })
            )
        )
        const models = await discoverModels({ provider: 'opencode-go' })
        const protocols = Object.fromEntries(
            models.map((entry) => [
                entry.id,
                modelSchema.parse(
                    model(entry.id, { ...entry, provider: 'opencode-go' })
                ).capabilities?.chatProtocol
            ])
        )
        expect(protocols).toEqual({
            'gpt-6-luna': 'openai-responses',
            'grok-4.7': 'openai-responses',
            'muse-spark-1.3-contributor': 'openai-responses',
            'minimax-m3': 'anthropic',
            'qwen3.8-flash': 'anthropic',
            'hy4-preview': 'openai-compatible',
            'kimi-k2.6': 'openai-compatible'
        })
    })

    it('imports Command Code model endpoints and preserves Messages routing through preset enrichment', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            response({
                data: [
                    {
                        id: 'claude-sonnet-4-6',
                        supported_endpoints: ['/messages']
                    },
                    {
                        id: 'future-claude-alias',
                        supported_endpoints: ['/messages']
                    },
                    {
                        id: 'deepseek/deepseek-v4.1-flash',
                        supported_endpoints: ['/chat/completions', '/responses']
                    },
                    { id: 'typesafe/jev', supported_endpoints: ['/systemone'] },
                    { id: 'embed', supported_endpoints: ['/embeddings'] },
                    {
                        id: 'responses-only',
                        supported_endpoints: ['/responses']
                    }
                ]
            })
        )
        vi.stubGlobal('fetch', fetcher)
        const models = await discoverModels({
            provider: 'commandcode',
            apiKey: 'test-key'
        })
        expect(String(fetcher.mock.calls[0][0])).toBe(
            'https://api.commandcode.ai/provider/v1/models'
        )
        expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
            'Bearer test-key'
        )
        expect(models).toHaveLength(4)
        expect(
            models.find((entry) => entry.id === 'claude-sonnet-4-6')
        ).toMatchObject({
            mode: 'chat',
            config: { maxTokens: 4096 },
            capabilities: { chatProtocol: 'anthropic', vision: true }
        })
        expect(
            models.find((entry) => entry.id === 'future-claude-alias')
                ?.capabilities?.chatProtocol
        ).toBe('anthropic')
        expect(
            models.find((entry) => entry.id.startsWith('deepseek'))
                ?.capabilities?.chatProtocol
        ).toBe('openai-compatible')
        expect(
            models.find((entry) => entry.id === 'typesafe/jev')
        ).toMatchObject({ mode: 'decision', decisionProtocol: 'system-one' })
    })
    it('reads ZenMux prices already denominated per million tokens and excludes unsupported modalities', async () => {
        const rate = (value: number) => [
            { value, unit: 'perMTokens', currency: 'USD' }
        ]
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                response({
                    data: [
                        {
                            id: 'moonshotai/kimi-k2.6',
                            display_name: 'Live Kimi',
                            input_modalities: ['text', 'image'],
                            output_modalities: ['text'],
                            pricings: {
                                prompt: rate(0.95),
                                completion: rate(4),
                                input_cache_read: rate(0.16),
                                web_search: [
                                    {
                                        value: 0.005,
                                        unit: 'perCount',
                                        currency: 'USD'
                                    }
                                ]
                            }
                        },
                        {
                            id: 'typesafe/jev-latest',
                            output_modalities: ['decisions']
                        },
                        { id: 'embedding', output_modalities: ['embedding'] },
                        { id: 'audio', output_modalities: ['audio'] },
                        { id: 'video', output_modalities: ['video'] }
                    ]
                })
            )
        )
        const models = await discoverModels({ provider: 'zenmux' })
        expect(models).toHaveLength(2)
        expect(
            models.find((entry) => entry.id === 'moonshotai/kimi-k2.6')
        ).toMatchObject({
            name: 'Live Kimi',
            mode: 'chat',
            pricing: { input: 0.95, output: 4, cacheRead: 0.16 },
            capabilities: {
                vision: true,
                unsupportedParameters: ['temperature']
            }
        })
        expect(
            models.find((entry) => entry.id === 'typesafe/jev-latest')
        ).toMatchObject({ mode: 'decision', decisionProtocol: 'system-one' })
    })
    it.each([
        {
            prompt: [
                {
                    value: 3,
                    currency: 'USD',
                    unit: 'perMTokens',
                    conditions: { prompt_tokens: { min: 200000 } }
                }
            ]
        },
        {
            prompt: [
                { value: 3, currency: 'USD', unit: 'perMTokens' },
                { value: 6, currency: 'USD', unit: 'perMTokens' }
            ]
        },
        { prompt: [{ value: 3, currency: 'CNY', unit: 'perMTokens' }] },
        {
            input_cache_read: [
                {
                    value: 0.3,
                    currency: 'USD',
                    unit: 'perMTokens',
                    conditions: { prompt_tokens: { max: 200000 } }
                }
            ]
        },
        {
            input_cache_write_5_min: [
                { value: 3.75, currency: 'USD', unit: 'perMTokens' }
            ],
            input_cache_write_1_h: [
                { value: 6, currency: 'USD', unit: 'perMTokens' }
            ]
        }
    ])(
        'does not flatten ambiguous ZenMux prices or replace them with preset prices: %j',
        async (overrides) => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue(
                    response({
                        data: [
                            {
                                id: 'anthropic/claude-sonnet-4.6',
                                output_modalities: ['text'],
                                pricings: {
                                    prompt: [
                                        {
                                            value: 3,
                                            currency: 'USD',
                                            unit: 'perMTokens'
                                        }
                                    ],
                                    completion: [
                                        {
                                            value: 15,
                                            currency: 'USD',
                                            unit: 'perMTokens'
                                        }
                                    ],
                                    ...overrides
                                }
                            }
                        ]
                    })
                )
            )
            const models = await discoverModels({ provider: 'zenmux' })
            expect(models[0].pricing).toBeUndefined()
        }
    )
    it('enriches known live models with preset parameters while respecting advertised prices', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                response({
                    data: [
                        {
                            id: 'kimi-k3',
                            name: 'Live Kimi',
                            pricing: {
                                prompt: '0.000004',
                                completion: '0.000016'
                            }
                        },
                        { id: 'unknown-model' }
                    ]
                })
            )
        )
        const models = await discoverModels({ provider: 'moonshot' })
        expect(models.find((entry) => entry.id === 'kimi-k3')).toMatchObject({
            name: 'Live Kimi',
            pricing: { input: 4, output: 16 },
            config: { maxTokens: 4096 },
            capabilities: { unsupportedParameters: ['temperature'] }
        })
        expect(
            models.find((entry) => entry.id === 'unknown-model')?.capabilities
        ).toBeUndefined()
    })
    it('does not guess preset prices or capabilities for a different endpoint', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(response({ data: [{ id: 'kimi-k3' }] }))
        )
        const models = await discoverModels({
            provider: 'moonshot',
            baseURL: 'https://proxy.test/v1'
        })
        expect(models[0].pricing).toBeUndefined()
        expect(models[0].capabilities).toBeUndefined()
    })
    it('requests decision models on OpenRouter and keeps the Jev chat router in chat mode', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            response({
                data: [
                    {
                        id: 'typesafe/jev-1.13',
                        architecture: { output_modalities: ['decisions'] },
                        pricing: { prompt: '0.000000042', completion: '0' }
                    },
                    {
                        id: 'typesafe/jev-router',
                        architecture: { output_modalities: ['text'] }
                    }
                ]
            })
        )
        vi.stubGlobal('fetch', fetcher)
        const catalog = await discoverModels({
            provider: 'openrouter',
            baseURL: 'https://router.test/api/v1?tenant=one'
        })
        expect(fetcher.mock.calls[0][0].pathname).toBe('/api/v1/models')
        expect(fetcher.mock.calls[0][0].searchParams.get('tenant')).toBe('one')
        expect(
            fetcher.mock.calls[0][0].searchParams.get('output_modalities')
        ).toBe('text,image,decisions')
        const jev = catalog.find((entry) => entry.id === 'typesafe/jev-1.13')!
        expect(jev).toMatchObject({
            id: 'typesafe/jev-1.13',
            name: 'typesafe/jev-1.13',
            mode: 'decision',
            decisionProtocol: 'system-one',
            pricing: { output: 0 }
        })
        expect(jev.pricing?.input).toBeCloseTo(0.042, 12)
        expect(catalog.find((entry) => entry.id.endsWith('router'))?.mode).toBe(
            'chat'
        )
    })
    it('recognizes Vercel evaluation types and prices without importing unsupported modalities', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                response({
                    data: [
                        {
                            id: 'typesafe-ai/jev',
                            type: 'evaluation',
                            pricing: { input: '0.000000042', output: '0' }
                        },
                        { id: 'openai/gpt-image', type: 'image' },
                        { id: 'openai/gpt-4o', type: 'language' },
                        { id: 'embed', type: 'embedding' }
                    ]
                })
            )
        )
        const catalog = await discoverModels({ provider: 'vercel' })
        expect(catalog).toHaveLength(3)
        const jev = catalog.find((entry) => entry.id === 'typesafe-ai/jev')!
        expect(jev).toMatchObject({
            mode: 'decision',
            decisionProtocol: 'system-one',
            pricing: { output: 0 }
        })
        expect(jev.pricing?.input).toBeCloseTo(0.042, 12)
        expect(catalog.find((entry) => entry.id.includes('image'))?.mode).toBe(
            'image'
        )
    })
    it('fetches and de-duplicates paginated models with provider authentication', async () => {
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce(
                response({ data: [{ id: 'b' }], has_more: true, last_id: 'b' })
            )
            .mockResolvedValueOnce(
                response({
                    data: [{ id: 'b' }, { id: 'a', display_name: 'Alpha' }],
                    has_more: false
                })
            )
        vi.stubGlobal('fetch', fetcher)
        const models = await discoverModels({
            provider: 'anthropic',
            apiKey: 'test-only'
        })
        expect(models.map((model) => model.id)).toEqual(['a', 'b'])
        expect(fetcher.mock.calls[1][0].searchParams.get('after_id')).toBe('b')
        expect(fetcher.mock.calls[0][1].headers['x-api-key']).toBe('test-only')
    })
    it('keeps only generative Google models and strips the resource prefix', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                response({
                    models: [
                        {
                            name: 'models/chat',
                            displayName: 'Chat',
                            supportedGenerationMethods: ['generateContent']
                        },
                        {
                            name: 'models/embed',
                            supportedGenerationMethods: ['embedContent']
                        }
                    ]
                })
            )
        )
        expect(await discoverModels({ provider: 'google' })).toEqual([
            { id: 'chat', name: 'Chat', mode: 'chat' }
        ])
    })
    it('converts advertised OpenRouter token prices to per-million prices', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                response({
                    data: [
                        {
                            id: 'image',
                            pricing: {
                                prompt: '0.000001',
                                completion: '0.000003',
                                input_cache_read: '0.0000001',
                                input_cache_write: '0.00000125'
                            },
                            architecture: { output_modalities: ['image'] }
                        }
                    ]
                })
            )
        )
        const discovered = (await discoverModels({ provider: 'openrouter' }))[0]
        expect(discovered).toMatchObject({
            mode: 'image',
            pricing: { input: 1, output: 3, cacheWrite: 1.25 }
        })
        expect(discovered.pricing?.cacheRead).toBeCloseTo(0.1, 12)
    })
    it('rejects invalid envelopes and repeated pagination rather than partially importing', async () => {
        const fetcher = vi
            .fn()
            .mockImplementation(async () =>
                response({ data: [{ id: 'a' }], has_more: true, last_id: 'a' })
            )
        vi.stubGlobal('fetch', fetcher)
        await expect(discoverModels({ provider: 'deepseek' })).rejects.toThrow(
            'repeated'
        )
        fetcher.mockResolvedValue(response({ data: [{}] }))
        await expect(discoverModels({ provider: 'deepseek' })).rejects.toThrow()
    })
    it('does not include an API error body in diagnostic output', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    new Response('sensitive-body', { status: 401 })
                )
        )
        await expect(discoverModels({ provider: 'deepseek' })).rejects.toThrow(
            'HTTP 401'
        )
        try {
            await discoverModels({ provider: 'deepseek' })
        } catch (error) {
            expect(String(error)).not.toContain('sensitive-body')
        }
    })
})
