import { describe, expect, it } from 'vitest'
import { PROVIDER_IDS } from '@/lib/types'
import { modelSchema } from '@/lib/validation'
import { model } from '@/test/fixtures'
import {
    applyModelCapabilities,
    resolveGenerationConfig
} from '@/features/benchmark/config'
import { buildProviderModels } from '@/features/models/domain/models'
import { getBaseURL, providerGroupKey, providerProtocol } from './catalog'
import {
    applyModelPreset,
    changeModelProvider,
    getModelPresets,
    resolveModelPricing
} from './presets'

describe('provider presets', () => {
    it('bundles Command Code and ZenMux chat and native Jev models with persistent protocol metadata', () => {
        for (const provider of ['commandcode', 'zenmux'] as const) {
            const models = buildProviderModels(
                { provider },
                getModelPresets(provider),
                []
            )
            expect(models.some((entry) => entry.mode === 'chat')).toBe(true)
            const jev = models.find((entry) => entry.mode === 'decision')!
            expect(jev.decisionProtocol).toBe('system-one')
            expect(modelSchema.parse(jev).provider).toBe(provider)
            const claude = models.find((entry) =>
                entry.providerId?.includes('claude')
            )!
            expect(providerProtocol(provider, modelSchema.parse(claude))).toBe(
                provider === 'commandcode' ? 'anthropic' : 'openai-compatible'
            )
        }
    })
    it('resolves official DeepSeek IDs and legacy aliases without overwriting explicit prices', () => {
        for (const id of [
            'deepseek-flash',
            'deepseek-v4-flash',
            'deepseek-v4-flash-vision-exp'
        ]) {
            expect(
                resolveModelPricing(model('local', { providerId: id }))
            ).toEqual({
                input: 0.15,
                output: 0.6,
                cacheRead: 0.003
            })
        }
        expect(
            resolveModelPricing(
                model('local', {
                    providerId: 'deepseek-v4-pro',
                    baseURL: 'https://api.deepseek.com/'
                })
            )
        ).toEqual({ input: 0.66, output: 1.98, cacheRead: 0.022 })
        expect(
            resolveModelPricing(
                model('local', {
                    providerId: 'deepseek-flash',
                    pricing: { input: 0, output: 0 }
                })
            )
        ).toEqual({ input: 0, output: 0 })
        expect(
            resolveModelPricing(
                model('local', {
                    providerId: 'deepseek-flash',
                    baseURL: 'https://proxy.test/v1'
                })
            )
        ).toBeUndefined()
        expect(
            resolveModelPricing(
                model('local', {
                    provider: 'custom',
                    providerId: 'deepseek-flash',
                    baseURL: 'https://api.deepseek.com/v1'
                })
            )
        ).toBeUndefined()
        expect(
            resolveModelPricing(
                model('local', { providerId: 'unknown-deepseek-model' })
            )
        ).toBeUndefined()
    })
    it('imports every bundled preset with valid settings and excludes duplicate models', () => {
        for (const provider of PROVIDER_IDS) {
            const presets = getModelPresets(provider)
            if (!presets.length) continue
            expect(new Set(presets.map((preset) => preset.id)).size).toBe(
                presets.length
            )
            expect(getBaseURL({ provider })).toMatch(/^https?:\/\//)
            const models = buildProviderModels({ provider }, presets, [])
            for (const imported of models)
                expect(modelSchema.safeParse(imported).success).toBe(true)
            expect(buildProviderModels({ provider }, presets, models)).toEqual(
                []
            )
            for (const preset of presets) {
                if (preset.config?.maxTokens && preset.outputLimit)
                    expect(preset.config.maxTokens).toBeLessThanOrEqual(
                        preset.outputLimit
                    )
            }
        }
    })
    it('keeps China, international and subscription endpoints separate', () => {
        for (const [a, b] of [
            ['moonshot', 'moonshot-cn'],
            ['dashscope', 'dashscope-intl'],
            ['siliconflow', 'siliconflow-intl'],
            ['zai', 'zai-coding'],
            ['zhipu', 'zhipu-coding'],
            ['minimax', 'minimax-cn']
        ] as const) {
            expect(getBaseURL({ provider: a })).not.toBe(
                getBaseURL({ provider: b })
            )
            expect(providerGroupKey({ provider: a })).not.toBe(
                providerGroupKey({ provider: b })
            )
        }
        expect(providerProtocol('minimax-cn')).toBe('anthropic')
        expect(getBaseURL({ provider: 'ollama' })).toBe(
            'http://localhost:11434/v1'
        )
    })
    it('fills defaults without changing the user connection or unrelated configuration', () => {
        const preset = getModelPresets('moonshot').find(
            (entry) => entry.id === 'kimi-k3'
        )!
        const value = applyModelPreset(
            model('local-id', {
                provider: 'moonshot',
                apiKey: 'test-key',
                baseURL: 'https://proxy.test/v1',
                config: { temperature: 0.4, timeout: { totalMs: 30000 } }
            }),
            preset
        )
        expect(value).toMatchObject({
            id: 'local-id',
            providerId: 'kimi-k3',
            apiKey: 'test-key',
            baseURL: 'https://proxy.test/v1',
            config: {
                maxTokens: 4096,
                temperature: 0.4,
                timeout: { totalMs: 30000 }
            },
            capabilities: { unsupportedParameters: ['temperature'] }
        })
        const resolved = applyModelCapabilities(
            resolveGenerationConfig(
                {
                    temperature: 0.7,
                    maxTokens: 4096,
                    topP: 1
                },
                value.config
            ),
            value.capabilities
        )
        expect(resolved.effective).not.toHaveProperty('temperature')
        expect(resolved.requested.temperature).toBe(0.4)
        expect(resolved.excludedParameters).toContain('temperature')
    })
    it('does not share mutable preset data between users and editors', () => {
        const preset = getModelPresets('groq')[0]
        preset.config!.maxTokens = 1
        preset.capabilities!.unsupportedParameters!.push('maxTokens')
        expect(getModelPresets('groq')[0].config?.maxTokens).toBe(4096)
        expect(
            getModelPresets('groq')[0].capabilities?.unsupportedParameters
        ).not.toContain('maxTokens')
    })
    it('resets provider-specific identity, endpoint, credentials and capabilities when switching', () => {
        const changed = changeModelProvider(
            model('a', {
                provider: 'minimax',
                apiKey: 'old-key',
                baseURL: 'https://old.test/v1',
                providerName: 'Old name',
                mode: 'decision',
                decisionProtocol: 'system-one',
                capabilities: { unsupportedParameters: ['maxTokens'] },
                pricing: { input: 99, output: 99 }
            }),
            'groq'
        )
        expect(changed).toMatchObject({
            provider: 'groq',
            providerId: '',
            mode: 'chat'
        })
        for (const key of [
            'apiKey',
            'baseURL',
            'providerName',
            'capabilities',
            'pricing',
            'decisionProtocol'
        ] as const)
            expect(changed[key]).toBeUndefined()
        expect(changeModelProvider(changed, 'typesafe')).toMatchObject({
            mode: 'decision',
            providerId: 'jev-latest'
        })
    })
    it('preserves explicit native decision protocols in imported presets', () => {
        const preset = getModelPresets('vercel').find(
            (entry) => entry.mode === 'decision'
        )!
        const value = applyModelPreset(
            model('v', { provider: 'vercel' }),
            preset
        )
        expect(value).toMatchObject({
            providerId: 'typesafe-ai/jev',
            mode: 'decision',
            decisionProtocol: 'system-one'
        })
    })
})
