import { describe, expect, it } from 'vitest'
import { model } from '@/test/fixtures'
import { getProvider } from './ai-provider'
import { getBaseURL } from './providers/catalog'
describe('provider adapters', () => {
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
