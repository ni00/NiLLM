import { afterEach, describe, expect, it, vi } from 'vitest'
import { model } from '@/test/fixtures'
import { streamModel } from './stream'
import type { StreamEvent } from './protocol'

afterEach(() => vi.unstubAllGlobals())

describe('SDK stream integration', () => {
    it.each([undefined, 0, 0.0042])(
        'prefers DeepSeek API billing (%s) and only falls back to reference prices when absent',
        async (reportedCost) => {
            vi.stubGlobal(
                'fetch',
                vi
                    .fn()
                    .mockResolvedValue(
                        new Response(
                            `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }] })}\n\n` +
                                `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 10, prompt_cache_hit_tokens: 80, prompt_cache_miss_tokens: 20, cost: reportedCost } })}\n\ndata: [DONE]\n\n`,
                            { headers: { 'Content-Type': 'text/event-stream' } }
                        )
                    )
            )
            const events: StreamEvent[] = []
            await streamModel(
                model('local', { providerId: 'deepseek-flash' }),
                [{ role: 'user', content: 'Hi' }],
                'r',
                (event) => events.push(event)
            )
            const final = events
                .filter((event) => event.type === 'update')
                .at(-1)!
            expect(final.metrics.cost).toBeCloseTo(
                reportedCost ?? 0.00000924,
                12
            )
            expect(final.metrics.costSource).toBe(
                reportedCost === undefined ? 'estimated' : 'api'
            )
            expect(final.metrics.cacheReadTokens).toBe(80)
        }
    )
    it('preserves reasoning and text and finishes with authoritative usage', async () => {
        const chunks = [
            {
                choices: [
                    {
                        index: 0,
                        delta: {
                            role: 'assistant',
                            reasoning_content: 'Thinking'
                        },
                        finish_reason: null
                    }
                ]
            },
            {
                choices: [
                    {
                        index: 0,
                        delta: { content: 'Hello world' },
                        finish_reason: null
                    }
                ]
            },
            {
                choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                usage: {
                    prompt_tokens: 7,
                    completion_tokens: 2,
                    total_tokens: 9,
                    prompt_cache_hit_tokens: 5,
                    prompt_cache_miss_tokens: 2
                }
            }
        ]
        const fetcher = vi
            .fn()
            .mockResolvedValue(
                new Response(
                    chunks
                        .map((c) => `data: ${JSON.stringify(c)}\n\n`)
                        .join('') + 'data: [DONE]\n\n',
                    { headers: { 'Content-Type': 'text/event-stream' } }
                )
            )
        vi.stubGlobal('fetch', fetcher)
        const events: StreamEvent[] = []
        await streamModel(
            model('stream-test', {
                apiKey: 'fake-test-key',
                pricing: { input: 2, output: 4, cacheRead: 0.2 }
            }),
            [
                { role: 'system', content: 'Be brief.' },
                { role: 'user', content: 'Hi' }
            ],
            'r',
            (event) => events.push(event)
        )
        const updates = events.filter((event) => event.type === 'update')
        expect(updates.map((event) => event.textDelta).join('')).toBe(
            'Hello world'
        )
        expect(
            updates.map((event) => event.reasoningDelta || '').join('')
        ).toBe('Thinking')
        expect(updates.at(-1)).toMatchObject({
            isFinal: true,
            metrics: {
                tokenCount: 2,
                inputTokens: 7,
                outputTokens: 2,
                cacheReadTokens: 5,
                costSource: 'estimated',
                tokenSource: 'api'
            }
        })
        expect(updates.at(-1)?.metrics.cost).toBeCloseTo(0.000013, 12)
        expect(fetcher).toHaveBeenCalledOnce()
    })
    it('keeps provider billing and cache details from the final SSE event without configured prices', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }] })}\n\n` +
                            `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12, cost: 0, prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 4 } } })}\n\ndata: [DONE]\n\n`,
                        { headers: { 'Content-Type': 'text/event-stream' } }
                    )
                )
        )
        const events: StreamEvent[] = []
        await streamModel(
            model('billed', { provider: 'openrouter' }),
            [{ role: 'user', content: 'Hi' }],
            'r',
            (event) => events.push(event)
        )
        expect(
            events.filter((event) => event.type === 'update').at(-1)
        ).toMatchObject({
            isFinal: true,
            metrics: {
                cost: 0,
                costSource: 'api',
                cacheReadTokens: 0,
                cacheWriteTokens: 4
            }
        })
    })
    it('surfaces API stream errors rather than recording false success', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    new Response('Unauthorized', { status: 401 })
                )
        )
        await expect(
            streamModel(
                model('error-test'),
                [{ role: 'user', content: 'Hi' }],
                'r',
                () => {}
            )
        ).rejects.toThrow()
    })
})
