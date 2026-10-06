import { afterEach, describe, expect, it, vi } from 'vitest'
import { providerFetch } from './transport'
import { discoverModels } from './discovery'

const { nativeFetch } = vi.hoisted(() => ({ nativeFetch: vi.fn() }))
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: nativeFetch }))
afterEach(() => {
    vi.unstubAllGlobals()
    nativeFetch.mockReset()
})

describe('OpenCode desktop transport', () => {
    it('imports models through native HTTP when the server has no CORS headers', async () => {
        vi.stubGlobal('isTauri', true)
        const browserFetch = vi
            .fn()
            .mockRejectedValue(new TypeError('Failed to fetch'))
        vi.stubGlobal('fetch', browserFetch)
        nativeFetch.mockResolvedValue(
            Response.json({ data: [{ id: 'kimi-k2.6' }] })
        )
        const models = await discoverModels({
            provider: 'opencode-go',
            apiKey: 'test-key'
        })
        expect(models[0].id).toBe('kimi-k2.6')
        expect(browserFetch).not.toHaveBeenCalled()
        const [url, init] = nativeFetch.mock.calls[0]
        expect(String(url)).toBe('https://opencode.ai/zen/go/v1/models')
        expect(init.headers.get('authorization')).toBe('Bearer test-key')
        expect(init.headers.get('user-agent')).toMatch(/^NiLLM\//)
        expect(init.maxRedirections).toBe(0)
    })

    it('preserves session, cancellation, and HTTP failures without retrying via the browser', async () => {
        vi.stubGlobal('isTauri', true)
        const browserFetch = vi.fn()
        vi.stubGlobal('fetch', browserFetch)
        const failure = new Response('Unauthorized', { status: 401 })
        nativeFetch.mockResolvedValue(failure)
        const controller = new AbortController()
        const result = await providerFetch(
            'https://opencode.ai/zen/go/v1/chat/completions',
            {
                method: 'POST',
                body: '{}',
                signal: controller.signal,
                headers: { 'x-opencode-session': 'conversation-one' }
            }
        )
        expect(result).toBe(failure)
        expect(nativeFetch.mock.calls[0][1].signal).toBe(controller.signal)
        expect(
            nativeFetch.mock.calls[0][1].headers.get('x-opencode-session')
        ).toBe('conversation-one')
        expect(browserFetch).not.toHaveBeenCalled()
    })

    it.each([
        [false, 'https://opencode.ai/zen/go/v1/models'],
        [true, 'https://api.example.com/v1/models'],
        [true, 'https://opencode.ai.evil.test/zen/go/v1/models'],
        [true, 'https://opencode.ai/other/models']
    ])(
        'keeps existing browser transport for native=%s URL=%s',
        async (native, url) => {
            vi.stubGlobal('isTauri', native)
            const browserFetch = vi
                .fn()
                .mockResolvedValue(Response.json({ data: [] }))
            vi.stubGlobal('fetch', browserFetch)
            await providerFetch(url)
            expect(browserFetch).toHaveBeenCalledWith(url, undefined)
            expect(nativeFetch).not.toHaveBeenCalled()
        }
    )
})
