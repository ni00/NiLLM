import { describe, expect, it, vi } from 'vitest'
import { discoverModels } from './discovery'
const response = (data: unknown) =>
    new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    })
describe('model discovery', () => {
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
                                completion: '0.000003'
                            },
                            architecture: { output_modalities: ['image'] }
                        }
                    ]
                })
            )
        )
        expect(
            (await discoverModels({ provider: 'openrouter' }))[0]
        ).toMatchObject({ mode: 'image', pricing: { input: 1, output: 3 } })
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
