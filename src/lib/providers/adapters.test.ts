import { generateText } from 'ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { model } from '@/test/fixtures'
import { getProvider } from '@/lib/ai-provider'
import { getBaseURL } from './catalog'

afterEach(() => vi.unstubAllGlobals())
describe('named provider adapters', () => {
    it.each([
        ['groq', 'https://api.groq.com/openai/v1/chat/completions'],
        [
            'dashscope',
            'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
        ],
        ['opencode-go', 'https://opencode.ai/zen/go/v1/chat/completions'],
        [
            'commandcode',
            'https://api.commandcode.ai/provider/v1/chat/completions'
        ],
        ['zenmux', 'https://zenmux.ai/api/v1/chat/completions']
    ] as const)(
        'uses the configured %s chat endpoint and bearer authentication',
        async (provider, endpoint) => {
            const fetcher = vi.fn().mockResolvedValue(
                Response.json({
                    id: 'completion',
                    created: 1,
                    model: 'test-model',
                    choices: [
                        {
                            index: 0,
                            message: { role: 'assistant', content: 'Done' },
                            finish_reason: 'stop'
                        }
                    ],
                    usage: {
                        prompt_tokens: 3,
                        completion_tokens: 2,
                        total_tokens: 5
                    }
                })
            )
            vi.stubGlobal('fetch', fetcher)
            const adapter = await getProvider(
                model('a', { provider, apiKey: 'test-key' })
            )
            const result = await generateText({
                model: adapter('test-model'),
                prompt: 'Hello',
                maxRetries: 0
            })
            expect(result.text).toBe('Done')
            expect(String(fetcher.mock.calls[0][0])).toBe(endpoint)
            expect(
                new Headers(fetcher.mock.calls[0][1].headers).get(
                    'authorization'
                )
            ).toBe('Bearer test-key')
        }
    )
    it.each(['minimax', 'minimax-cn'] as const)(
        'uses Anthropic Messages for %s instead of Chat Completions',
        async (provider) => {
            const fetcher = vi.fn().mockResolvedValue(
                Response.json({
                    id: 'msg',
                    type: 'message',
                    role: 'assistant',
                    model: 'MiniMax-M2.7',
                    content: [{ type: 'text', text: 'Done' }],
                    stop_reason: 'end_turn',
                    stop_sequence: null,
                    usage: { input_tokens: 3, output_tokens: 2 }
                })
            )
            vi.stubGlobal('fetch', fetcher)
            const adapter = await getProvider(
                model('a', { provider, apiKey: 'test-key' })
            )
            const result = await generateText({
                model: adapter('MiniMax-M2.7'),
                prompt: 'Hello',
                maxOutputTokens: 4096,
                maxRetries: 0
            })
            expect(result.text).toBe('Done')
            expect(String(fetcher.mock.calls[0][0])).toBe(
                `https://api.minimax.${provider === 'minimax' ? 'io' : 'cn'}/anthropic/v1/messages`
            )
            expect(
                new Headers(fetcher.mock.calls[0][1].headers).get('x-api-key')
            ).toBe('test-key')
            const body = JSON.parse(fetcher.mock.calls[0][1].body)
            expect(body).toMatchObject({
                model: 'MiniMax-M2.7',
                max_tokens: 4096
            })
        }
    )
})

describe('provider adapters', () => {
    it('runs Command Code Messages and Chat models concurrently without sharing the wrong adapter', async () => {
        const fetcher = vi.fn().mockImplementation(async (url: string) =>
            url.endsWith('/messages')
                ? Response.json({
                      id: 'msg',
                      type: 'message',
                      role: 'assistant',
                      model: 'claude-sonnet-4-6',
                      content: [{ type: 'text', text: 'Claude done' }],
                      stop_reason: 'end_turn',
                      stop_sequence: null,
                      usage: { input_tokens: 3, output_tokens: 2 }
                  })
                : Response.json({
                      id: 'completion',
                      created: 1,
                      model: 'deepseek/deepseek-v4.1-flash',
                      choices: [
                          {
                              index: 0,
                              message: {
                                  role: 'assistant',
                                  content: 'DeepSeek done'
                              },
                              finish_reason: 'stop'
                          }
                      ],
                      usage: {
                          prompt_tokens: 3,
                          completion_tokens: 2,
                          total_tokens: 5
                      }
                  })
        )
        vi.stubGlobal('fetch', fetcher)
        const connection = {
            provider: 'commandcode' as const,
            apiKey: 'mixed-key'
        }
        const claude = model('claude-local', {
            ...connection,
            providerId: 'claude-sonnet-4-6'
        })
        const deepseek = model('deepseek-local', {
            ...connection,
            providerId: 'deepseek/deepseek-v4.1-flash'
        })
        const adapters = await Promise.all([
            getProvider(claude),
            getProvider(deepseek)
        ])
        expect(adapters[0]).not.toBe(adapters[1])
        const results = await Promise.all(
            [claude, deepseek].map((value, index) =>
                generateText({
                    model: adapters[index](value.providerId!),
                    prompt: 'Hello',
                    maxOutputTokens: 4096,
                    maxRetries: 0
                })
            )
        )
        expect(results.map((result) => result.text)).toEqual([
            'Claude done',
            'DeepSeek done'
        ])
        for (const [url, init] of fetcher.mock.calls) {
            const body = JSON.parse(init.body)
            const headers = new Headers(init.headers)
            if (body.model.startsWith('claude')) {
                expect(String(url)).toBe(
                    'https://api.commandcode.ai/provider/v1/messages'
                )
                expect(headers.get('x-api-key')).toBe('mixed-key')
                expect(body.max_tokens).toBe(4096)
            } else {
                expect(String(url)).toBe(
                    'https://api.commandcode.ai/provider/v1/chat/completions'
                )
                expect(headers.get('authorization')).toBe('Bearer mixed-key')
            }
        }
        const declared = model('alias', {
            ...connection,
            providerId: 'messages-alias',
            capabilities: { chatProtocol: 'anthropic' }
        })
        expect(
            (await getProvider(declared))('messages-alias').provider
        ).toContain('anthropic')
    })
    it('reuses a connection across model IDs but invalidates changed endpoints and credentials', () => {
        const first = getProvider(model('one', { apiKey: 'fake-a' }))
        expect(getProvider(model('two', { apiKey: 'fake-a' }))).toBe(first)
        expect(getProvider(model('one', { apiKey: 'fake-b' }))).not.toBe(first)
        expect(
            getProvider(
                model('one', {
                    apiKey: 'fake-a',
                    baseURL: 'https://example.com/v1'
                })
            )
        ).not.toBe(first)
    })
    it('creates native Anthropic and Google adapters and supports legacy custom endpoints', async () => {
        expect(
            (await getProvider(model('a', { provider: 'anthropic' })))(
                'claude-test'
            ).provider
        ).toContain('anthropic')
        expect(
            (await getProvider(model('a', { provider: 'google' })))(
                'gemini-test'
            ).provider
        ).toContain('google')
        expect(
            (
                await getProvider(
                    model('a', {
                        provider: 'other',
                        baseURL: 'http://localhost:11434/v1'
                    })
                )
            )('local').provider
        ).toContain('custom')
    })
    it('rejects URLs with unsafe protocols or embedded credentials', () => {
        expect(() =>
            getBaseURL({ provider: 'custom', baseURL: 'javascript:alert(1)' })
        ).toThrow()
        expect(() =>
            getBaseURL({
                provider: 'custom',
                baseURL: 'https://user:password@example.com/v1'
            })
        ).toThrow()
    })
})
