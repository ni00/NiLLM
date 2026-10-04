import { describe, expect, it, vi } from 'vitest'
import { model } from '@/test/fixtures'
import { streamModel } from './stream'
import type { StreamEvent } from './protocol'

describe('SDK stream integration', () => {
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
                    total_tokens: 9
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
            model('stream-test', { apiKey: 'fake-test-key' }),
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
                tokenSource: 'api'
            }
        })
        expect(fetcher).toHaveBeenCalledOnce()
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
