import { afterEach, describe, expect, it, vi } from 'vitest'
import { model } from '@/test/fixtures'
import type { StreamEvent } from '@/lib/streaming/protocol'
import { DECISION_EXAMPLE } from '@/lib/decisions'
import { executeDecision } from './execute'
import { exampleResponse } from '@/test/decision-fixtures'

afterEach(() => vi.unstubAllGlobals())
const messages = [
    { role: 'system' as const, content: 'Old global prompt' },
    { role: 'user' as const, content: 'Old conversation' },
    { role: 'assistant' as const, content: 'Old answer' },
    { role: 'user' as const, content: JSON.stringify(DECISION_EXAMPLE) }
]

describe('decision provider execution', () => {
    it.each([
        [
            'commandcode',
            'typesafe/jev',
            'https://api.commandcode.ai/provider/v1/systemone'
        ],
        ['zenmux', 'typesafe/jev-latest', 'https://zenmux.ai/api/v1/systemone'],
        [
            'openrouter',
            'typesafe/jev-1.13',
            'https://openrouter.ai/api/alpha/decisions'
        ],
        [
            'vercel',
            'typesafe-ai/jev',
            'https://ai-gateway.vercel.sh/typesafe/v1/systemone'
        ]
    ] as const)(
        'routes %s Jev to its native decision endpoint and uses billed cost',
        async (provider, providerId, endpoint) => {
            const fetcher = vi.fn().mockResolvedValue(
                Response.json({
                    ...exampleResponse,
                    usage: {
                        input_tokens: 100,
                        output_tokens: 0,
                        cost: 0.000012
                    }
                })
            )
            vi.stubGlobal('fetch', fetcher)
            const events: StreamEvent[] = []
            await executeDecision(
                model('jev', {
                    provider,
                    providerId,
                    mode: 'decision',
                    apiKey: 'test-key',
                    pricing: { input: 999, output: 999 }
                }),
                messages,
                'r',
                (event) => events.push(event)
            )
            const [url, init] = fetcher.mock.calls[0]
            expect(String(url)).toBe(endpoint)
            expect(init.headers.Authorization).toBe('Bearer test-key')
            expect(JSON.parse(init.body)).toEqual({
                ...DECISION_EXAMPLE,
                model: providerId
            })
            expect(events[0]).toMatchObject({
                type: 'update',
                metrics: {
                    cost: 0.000012,
                    costSource: 'api',
                    tokenSource: 'api',
                    outputTokens: 0
                },
                isFinal: true
            })
            expect(
                events[0].type === 'update' &&
                    JSON.parse(events[0].textDelta).confidenceSource
            ).toBe('provider')
        }
    )
    it('uses stateless OpenAI Responses with strict text.format and reasoning usage', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            Response.json({
                status: 'completed',
                model: 'gpt-model-version',
                output: [
                    { type: 'reasoning', summary: [] },
                    {
                        type: 'message',
                        content: [
                            {
                                type: 'output_text',
                                text: JSON.stringify({
                                    answers: exampleResponse.answers
                                })
                            }
                        ]
                    }
                ],
                usage: {
                    input_tokens: 200,
                    output_tokens: 110,
                    input_tokens_details: { cached_tokens: 160 },
                    output_tokens_details: { reasoning_tokens: 10 }
                }
            })
        )
        vi.stubGlobal('fetch', fetcher)
        const events: StreamEvent[] = []
        await executeDecision(
            model('openai', {
                provider: 'openai',
                mode: 'decision',
                decisionProtocol: 'openai-responses',
                pricing: { input: 2, output: 4, cacheRead: 0.2 },
                config: { maxTokens: 2000 }
            }),
            messages,
            'r',
            (event) => events.push(event)
        )
        expect(String(fetcher.mock.calls[0][0])).toBe(
            'https://api.openai.com/v1/responses'
        )
        const body = JSON.parse(fetcher.mock.calls[0][1].body)
        expect(body).toMatchObject({
            store: false,
            stream: false,
            max_output_tokens: 2000,
            text: { format: { type: 'json_schema', strict: true } }
        })
        expect(body).not.toHaveProperty('messages')
        expect(body).not.toHaveProperty('previous_response_id')
        expect(body.input).toHaveLength(1)
        expect(JSON.parse(body.input[0].content[0].text)).toEqual(
            DECISION_EXAMPLE
        )
        expect(body.text.format.schema.properties.answers.required).toEqual([
            'department',
            'urgent',
            'urgency'
        ])
        expect(events[0]).toMatchObject({
            type: 'update',
            metrics: {
                inputTokens: 200,
                outputTokens: 110,
                reasoningTokens: 10,
                cacheReadTokens: 160,
                costSource: 'estimated'
            },
            isFinal: true
        })
        expect(
            events[0].type === 'update' && events[0].metrics.cost
        ).toBeCloseTo(0.000552, 12)
        expect(
            events[0].type === 'update' && JSON.parse(events[0].textDelta)
        ).toMatchObject({
            model: 'gpt-model-version',
            confidenceSource: 'self-reported'
        })
    })
    it.each([
        { status: 'incomplete', output: [] },
        {
            status: 'completed',
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'refusal',
                            refusal: 'sensitive-provider-message'
                        }
                    ]
                }
            ]
        },
        {
            status: 'completed',
            output: [
                {
                    type: 'message',
                    content: [{ type: 'output_text', text: '{}' }]
                }
            ]
        }
    ])(
        'rejects incomplete, refused and malformed Responses output without a false completion',
        async (body) => {
            vi.stubGlobal(
                'fetch',
                vi
                    .fn()
                    .mockResolvedValue(
                        Response.json({ ...body, model: 'gpt-test' })
                    )
            )
            const emit = vi.fn()
            await expect(
                executeDecision(
                    model('gpt', {
                        provider: 'openai',
                        mode: 'decision',
                        decisionProtocol: 'openai-responses'
                    }),
                    messages,
                    'r',
                    emit
                )
            ).rejects.toThrow('Invalid decision response')
            expect(emit).not.toHaveBeenCalled()
        }
    )
    it('calls native Jev once with the typed task and authoritative usage', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            Response.json({
                ...exampleResponse,
                usage: { input_tokens: 100, output_tokens: 20 }
            })
        )
        vi.stubGlobal('fetch', fetcher)
        const events: StreamEvent[] = []
        await executeDecision(
            model('jev', {
                provider: 'typesafe',
                providerId: 'jev-latest',
                mode: 'decision',
                apiKey: 'fake-key',
                pricing: { input: 0.042, output: 0 }
            }),
            messages,
            'r',
            (event) => events.push(event)
        )
        const [url, init] = fetcher.mock.calls[0]
        expect(String(url)).toBe('https://api.typesafe.ai/v1/systemone')
        expect(JSON.parse(init.body)).toEqual({
            ...DECISION_EXAMPLE,
            model: 'jev-latest'
        })
        expect(JSON.stringify(init)).not.toContain('Old conversation')
        expect(events).toHaveLength(1)
        expect(events[0]).toMatchObject({
            type: 'update',
            isFinal: true,
            metrics: {
                ttft: 0,
                tps: 0,
                inputTokens: 100,
                outputTokens: 20,
                tokenSource: 'api'
            }
        })
        expect(
            events[0].type === 'update' && events[0].metrics.cost
        ).toBeCloseTo(0.0000042, 12)
        expect(
            events[0].type === 'update' && JSON.parse(events[0].textDelta)
        ).toMatchObject({ model: 'jev-1.13.0', confidenceSource: 'provider' })
    })
    it('uses OpenAI strict structured output for the same task without conversation history', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            Response.json({
                id: 'completion',
                created: 1,
                model: 'openai-decision',
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: JSON.stringify({
                                answers: exampleResponse.answers
                            })
                        },
                        finish_reason: 'stop'
                    }
                ],
                usage: {
                    prompt_tokens: 200,
                    completion_tokens: 100,
                    total_tokens: 300
                }
            })
        )
        vi.stubGlobal('fetch', fetcher)
        const events: StreamEvent[] = []
        await executeDecision(
            model('openai-decision', { provider: 'openai', mode: 'decision' }),
            messages,
            'r',
            (event) => events.push(event)
        )
        expect(fetcher).toHaveBeenCalledOnce()
        const body = JSON.parse(fetcher.mock.calls[0][1].body)
        expect(body.response_format.type).toBe('json_schema')
        expect(
            body.response_format.json_schema.schema.properties.answers.required
        ).toEqual(['department', 'urgent', 'urgency'])
        expect(body.messages).toHaveLength(2)
        expect(JSON.parse(body.messages[1].content)).toEqual(DECISION_EXAMPLE)
        expect(events[0]).toMatchObject({
            type: 'update',
            isFinal: true,
            metrics: { ttft: 0, tps: 0, inputTokens: 200, outputTokens: 100 }
        })
        expect(
            events[0].type === 'update' &&
                JSON.parse(events[0].textDelta).confidenceSource
        ).toBe('self-reported')
    })
    it('does not emit false success or expose the provider error body', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    new Response('secret-request-header', { status: 401 })
                )
        )
        const emit = vi.fn()
        await expect(
            executeDecision(
                model('jev', { provider: 'typesafe', mode: 'decision' }),
                messages,
                'r',
                emit
            )
        ).rejects.toThrow('HTTP 401')
        expect(emit).not.toHaveBeenCalled()
    })
    it('rejects bad input and pre-cancelled requests without a network call', async () => {
        const fetcher = vi.fn()
        vi.stubGlobal('fetch', fetcher)
        await expect(
            executeDecision(
                model('jev', { provider: 'typesafe', mode: 'decision' }),
                [{ role: 'user', content: '{}' }],
                'r',
                () => {}
            )
        ).rejects.toThrow('Decision input')
        await expect(
            executeDecision(
                model('jev', { provider: 'typesafe', mode: 'decision' }),
                messages,
                'r',
                () => {},
                AbortSignal.abort()
            )
        ).rejects.toThrow()
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('rejects a native malformed probability distribution without emitting completion', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                Response.json({
                    ...exampleResponse,
                    answers: {
                        ...exampleResponse.answers,
                        department: {
                            ...exampleResponse.answers.department,
                            probabilities: {
                                billing: 0.5,
                                technical: 0.1,
                                sales: 0
                            }
                        }
                    }
                })
            )
        )
        const emit = vi.fn()
        await expect(
            executeDecision(
                model('jev', { provider: 'typesafe', mode: 'decision' }),
                messages,
                'r',
                emit
            )
        ).rejects.toThrow('Invalid decision response')
        expect(emit).not.toHaveBeenCalled()
    })
})
