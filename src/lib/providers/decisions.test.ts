import { describe, expect, it } from 'vitest'
import { model } from '@/test/fixtures'
import {
    applyModelCapabilities,
    resolveGenerationConfig
} from '@/lib/generation-config'
import { decisionEndpoint, resolveDecisionProtocol } from './decisions'

describe('decision transports', () => {
    it.each([
        ['openrouter', '~typesafe/jev-latest', 'system-one'],
        ['openrouter', 'typesafe/jev-1.13', 'system-one'],
        ['openrouter', 'typesafe/jev-router', 'structured'],
        ['openrouter', 'openai/gpt-4o', 'structured'],
        ['vercel', 'typesafe-ai/jev', 'system-one'],
        ['commandcode', 'typesafe/jev', 'system-one'],
        ['commandcode', 'deepseek/deepseek-v4.1-flash', 'structured'],
        ['zenmux', 'typesafe/jev-latest', 'system-one'],
        ['zenmux', 'typesafe/jev-router', 'structured'],
        ['vercel', 'openai/gpt-4o', 'structured']
    ] as const)('resolves %s / %s to %s', (provider, providerId, expected) => {
        expect(
            resolveDecisionProtocol(
                model('a', { provider, providerId, mode: 'decision' })
            )
        ).toBe(expected)
    })
    it.each([
        [
            'vercel',
            'https://gateway.test/v1',
            'https://gateway.test/typesafe/v1/systemone'
        ],
        [
            'vercel',
            'https://gateway.test/prefix/typesafe',
            'https://gateway.test/prefix/typesafe/v1/systemone'
        ],
        [
            'vercel',
            'https://gateway.test/prefix/typesafe/v1',
            'https://gateway.test/prefix/typesafe/v1/systemone'
        ],
        [
            'vercel',
            'https://gateway.test/typesafe/v1/systemone',
            'https://gateway.test/typesafe/v1/systemone'
        ],
        [
            'openrouter',
            'https://gateway.test/api/v1',
            'https://gateway.test/api/alpha/decisions'
        ],
        [
            'openrouter',
            'https://gateway.test/api/v1/systemone',
            'https://gateway.test/api/v1/systemone'
        ],
        [
            'openrouter',
            'https://gateway.test/api/alpha/decisions',
            'https://gateway.test/api/alpha/decisions'
        ],
        [
            'typesafe',
            'https://gateway.test/v1?tenant=one',
            'https://gateway.test/v1/systemone?tenant=one'
        ]
    ] as const)(
        'builds native endpoints for %s / %s',
        (provider, baseURL, expected) => {
            expect(
                String(
                    decisionEndpoint(
                        model('a', { provider, baseURL }),
                        'system-one'
                    )
                )
            ).toBe(expected)
        }
    )
    it('allows a structured language-model baseline on a gateway while removing native sampling parameters', () => {
        const requested = resolveGenerationConfig({
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 4096,
            seed: 1,
            topK: 40,
            systemPrompt: 'Global',
            telemetry: { isEnabled: true },
            timeout: { totalMs: 60000, stepMs: 10000 }
        })
        for (const provider of ['openrouter', 'vercel'] as const) {
            const native = model('a', {
                provider,
                mode: 'decision',
                decisionProtocol: 'system-one'
            })
            const effective = applyModelCapabilities(
                requested,
                undefined,
                native
            )
            expect(effective.requested).toEqual(requested.requested)
            expect(effective.effective).toEqual({ timeout: { totalMs: 60000 } })
            expect(
                applyModelCapabilities(effective, undefined, native)
            ).toEqual(effective)
            expect(
                applyModelCapabilities(requested, undefined, {
                    ...native,
                    decisionProtocol: 'structured'
                }).effective.temperature
            ).toBe(0.7)
        }
        const responses = applyModelCapabilities(
            requested,
            undefined,
            model('a', {
                provider: 'openai',
                mode: 'decision',
                decisionProtocol: 'openai-responses'
            })
        )
        expect(responses.effective).toMatchObject({
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 4096,
            timeout: { totalMs: 60000 }
        })
        expect(responses.effective).not.toHaveProperty('seed')
        expect(responses.effective).not.toHaveProperty('topK')
        expect(responses.excludedParameters).toContain('telemetry')
    })
})
