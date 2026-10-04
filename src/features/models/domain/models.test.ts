import { describe, expect, it } from 'vitest'
import { model } from '@/test/fixtures'
import { buildProviderModels, groupModels, parseModels } from './models'

describe('provider model imports', () => {
    it('adds missing models once while preserving existing settings', () => {
        const existing = model('a', {
            providerId: 'one',
            config: { temperature: 0.1 }
        })
        const connection = { provider: 'deepseek' as const }
        const catalog = [
            { id: 'one', name: 'One', mode: 'chat' as const },
            { id: 'two', name: 'Two', mode: 'chat' as const }
        ]
        const added = buildProviderModels(
            connection,
            [...catalog, catalog[1]],
            [existing]
        )
        expect(added).toHaveLength(1)
        expect(added[0].providerId).toBe('two')
        expect(existing.config?.temperature).toBe(0.1)
    })
    it('separates services sharing a provider protocol and keeps custom labels', () => {
        expect(
            groupModels([
                model('a', {
                    provider: 'custom',
                    providerName: 'Local',
                    baseURL: 'http://localhost:11434/v1'
                }),
                model('b', {
                    provider: 'custom',
                    providerName: 'Remote',
                    baseURL: 'https://example.com/v1'
                })
            ]).map((group) => group.label)
        ).toEqual(['Local', 'Remote'])
    })
    it('validates complete imported model data before it reaches the store', () => {
        expect(() => parseModels([{ ...model(), enabled: 'yes' }])).toThrow()
        expect(() =>
            parseModels([{ ...model(), config: { maxTokens: -1 } }])
        ).toThrow()
        expect(
            parseModels([model('a', { provider: 'other' })])[0].provider
        ).toBe('other')
    })
})
