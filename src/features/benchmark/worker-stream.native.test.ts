import { afterEach, describe, expect, it, vi } from 'vitest'
import { runWorkerStream } from './worker-stream'
import { generationWorkers } from './worker-pool'
import { model } from '@/test/fixtures'

const { nativeFetch } = vi.hoisted(() => ({ nativeFetch: vi.fn() }))
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: nativeFetch }))

afterEach(() => {
    generationWorkers.dispose()
    vi.unstubAllGlobals()
    nativeFetch.mockReset()
})

describe('native OpenCode generation', () => {
    it.each(['gpt-6-luna', 'grok-4.7', 'muse-spark-1.3-contributor'])(
        'streams saved %s models through Responses with history and usage',
        async (id) => {
            vi.stubGlobal('isTauri', true)
            const chunks = [
                {
                    type: 'response.created',
                    response: { id: 'resp-test', created_at: 1, model: id }
                },
                {
                    type: 'response.output_item.added',
                    output_index: 0,
                    item: { type: 'message', id: 'msg-test' }
                },
                {
                    type: 'response.output_text.delta',
                    item_id: 'msg-test',
                    output_index: 0,
                    delta: 'Done'
                },
                {
                    type: 'response.output_item.done',
                    output_index: 0,
                    item: { type: 'message', id: 'msg-test' }
                },
                {
                    type: 'response.completed',
                    response: {
                        usage: {
                            input_tokens: 20,
                            output_tokens: 5,
                            input_tokens_details: { cached_tokens: 10 },
                            output_tokens_details: { reasoning_tokens: 2 }
                        }
                    }
                }
            ]
            nativeFetch.mockImplementation(
                async () =>
                    new Response(
                        chunks
                            .map(
                                (chunk) => `data: ${JSON.stringify(chunk)}\n\n`
                            )
                            .join(''),
                        { headers: { 'Content-Type': 'text/event-stream' } }
                    )
            )
            const outcome = await runWorkerStream({
                // Existing imported models have no chatProtocol metadata.
                model: model('local-id', {
                    provider: 'opencode-go',
                    providerId: id,
                    apiKey: 'test-key',
                    config: { maxTokens: 4096, temperature: 0.7, topP: 1 }
                }),
                messages: [
                    { role: 'user', content: 'First' },
                    { role: 'assistant', content: 'Earlier answer' },
                    { role: 'user', content: 'Continue' }
                ],
                resultId: 'responses-turn',
                sessionId: 'existing-conversation',
                onUpdate: vi.fn()
            })
            expect(outcome).toMatchObject({
                status: 'completed',
                response: 'Done',
                metrics: {
                    inputTokens: 20,
                    outputTokens: 5,
                    cacheReadTokens: 10,
                    reasoningTokens: 2
                }
            })
            expect(nativeFetch).toHaveBeenCalledOnce()
            const [url, init] = nativeFetch.mock.calls[0]
            expect(String(url)).toBe('https://opencode.ai/zen/go/v1/responses')
            expect(init.headers.get('authorization')).toBe('Bearer test-key')
            expect(init.headers.get('x-opencode-session')).toBe(
                'existing-conversation'
            )
            const body = JSON.parse(init.body)
            expect(body).toMatchObject({
                model: id,
                stream: true,
                max_output_tokens: 4096,
                store: false
            })
            expect(
                body.input.map((message: { role: string }) => message.role)
            ).toEqual(['user', 'assistant', 'user'])
            expect(body.messages).toBeUndefined()
            if (id.startsWith('gpt-')) {
                expect(body.temperature).toBeUndefined()
                expect(body.top_p).toBeUndefined()
            }
        }
    )

    it('aborts the native connection when its connection timeout expires', async () => {
        vi.stubGlobal('isTauri', true)
        let signal: AbortSignal | undefined
        nativeFetch.mockImplementation((_url, init) => {
            signal = init.signal
            return new Promise((_resolve, reject) => {
                signal!.addEventListener(
                    'abort',
                    () => reject(new DOMException('Aborted', 'AbortError')),
                    { once: true }
                )
            })
        })
        const outcome = await runWorkerStream({
            model: model('timeout', {
                provider: 'opencode-go',
                providerId: 'kimi-k2.6',
                config: { connectTimeout: 500 }
            }),
            messages: [{ role: 'user', content: 'Hi' }],
            resultId: 'timeout',
            onUpdate: vi.fn()
        })
        expect(outcome).toMatchObject({
            status: 'error',
            error: 'Connection timed out after 0.5s.'
        })
        expect(signal?.aborted).toBe(true)
    })

    it('streams through Tauri with a stable conversation ID across turns and no Web Worker', async () => {
        vi.stubGlobal('isTauri', true)
        const worker = vi.fn()
        const browserFetch = vi.fn()
        vi.stubGlobal('Worker', worker)
        vi.stubGlobal('fetch', browserFetch)
        nativeFetch.mockImplementation(
            async () =>
                new Response(
                    'data: {"choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n' +
                        'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
                    { headers: { 'Content-Type': 'text/event-stream' } }
                )
        )
        for (const resultId of ['turn-one', 'turn-two']) {
            const outcome = await runWorkerStream({
                model: model('kimi', {
                    provider: 'opencode-go',
                    providerId: 'kimi-k2.6'
                }),
                messages: [{ role: 'user', content: 'Hi' }],
                resultId,
                sessionId: 'conversation',
                onUpdate: vi.fn()
            })
            expect(outcome).toMatchObject({
                status: 'completed',
                response: 'Hello'
            })
        }
        expect(nativeFetch).toHaveBeenCalledTimes(2)
        for (const [url, init] of nativeFetch.mock.calls) {
            expect(String(url)).toBe(
                'https://opencode.ai/zen/go/v1/chat/completions'
            )
            expect(init.headers.get('x-opencode-session')).toBe('conversation')
        }
        expect(worker).not.toHaveBeenCalled()
        expect(browserFetch).not.toHaveBeenCalled()
    })

    it('cancels only its own native request and still completes its sibling', async () => {
        vi.stubGlobal('isTauri', true)
        const signals: AbortSignal[] = []
        const streams: ReadableStreamDefaultController<Uint8Array>[] = []
        nativeFetch.mockImplementation(async (_url, init) => {
            signals.push(init.signal)
            return new Response(
                new ReadableStream({
                    start(controller) {
                        streams.push(controller)
                        init.signal.addEventListener(
                            'abort',
                            () =>
                                controller.error(
                                    new DOMException('Aborted', 'AbortError')
                                ),
                            { once: true }
                        )
                    }
                }),
                { headers: { 'Content-Type': 'text/event-stream' } }
            )
        })
        const controller = new AbortController()
        const options = {
            model: model('kimi', {
                provider: 'opencode-go',
                providerId: 'kimi-k2.6'
            }),
            messages: [{ role: 'user' as const, content: 'Hi' }],
            onUpdate: vi.fn()
        }
        const first = runWorkerStream({
            ...options,
            resultId: 'first',
            signal: controller.signal
        })
        await vi.waitFor(() => expect(signals).toHaveLength(1))
        const second = runWorkerStream({ ...options, resultId: 'second' })
        await vi.waitFor(() => expect(signals).toHaveLength(2))
        controller.abort()
        expect((await first).status).toBe('cancelled')
        expect(signals[0].aborted).toBe(true)
        expect(signals[1].aborted).toBe(false)
        streams[1].enqueue(
            new TextEncoder().encode(
                'data: {"choices":[{"index":0,"delta":{"content":"Done"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'
            )
        )
        streams[1].close()
        expect(await second).toMatchObject({
            status: 'completed',
            response: 'Done'
        })
    })
})
