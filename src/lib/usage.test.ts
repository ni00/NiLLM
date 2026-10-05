import { describe, expect, it } from 'vitest'
import { result, model, session } from '@/test/fixtures'
import { parseBackup } from './validation'
import { buildReportDocument } from '@/features/stats/domain/report'
import {
    cacheHitRate,
    formatUsageCost,
    normalizeUsage,
    summarizeUsage,
    usageMetrics,
    withEstimatedCost
} from './usage'

describe('usage accounting', () => {
    it('fills legacy DeepSeek costs with cache discounts and keeps originals and recorded billing intact', () => {
        const legacy = result('legacy', {
            metrics: {
                ...result().metrics,
                inputTokens: 100,
                outputTokens: 10,
                cacheReadTokens: 80
            }
        })
        const deepseek = model('a', { providerId: 'deepseek-flash' })
        const filled = withEstimatedCost(legacy, deepseek)
        expect(filled.metrics.cost).toBeCloseTo(0.00000924, 12)
        expect(filled.metrics.costSource).toBe('estimated')
        expect(legacy.metrics.cost).toBeUndefined()
        for (const cost of [0, 0.042]) {
            const billed = {
                ...legacy,
                metrics: { ...legacy.metrics, cost, costSource: 'api' as const }
            }
            expect(withEstimatedCost(billed, deepseek)).toBe(billed)
        }
        for (const status of ['pending', 'error', 'cancelled'] as const) {
            const unfinished = { ...legacy, status }
            expect(withEstimatedCost(unfinished, deepseek)).toBe(unfinished)
        }
        const incomplete = {
            ...legacy,
            metrics: { ...legacy.metrics, inputTokens: undefined }
        }
        expect(withEstimatedCost(incomplete, deepseek)).toBe(incomplete)
        const report = buildReportDocument(
            {
                source: 'arena',
                models: [deepseek],
                sessions: [session({ a: [legacy] })],
                filter: {}
            },
            { includeContent: false, includeReasoning: false },
            123
        )
        expect(report.records[0].cost).toBeCloseTo(filled.metrics.cost!, 12)
    })
    it('uses frozen historical identity and prices rather than a model changed after the request', () => {
        const legacy = result('legacy', {
            metrics: {
                ...result().metrics,
                inputTokens: 100,
                outputTokens: 10,
                cacheReadTokens: 80
            },
            requestSnapshot: {
                schemaVersion: 1,
                capturedAt: 1,
                context: 'conversation',
                parameters: {
                    sources: {},
                    requested: { temperature: 0.7, maxTokens: 4096, topP: 0.9 },
                    effective: { temperature: 0.7, maxTokens: 4096, topP: 0.9 },
                    excludedParameters: []
                },
                model: {
                    id: 'a',
                    name: 'Flash',
                    provider: 'deepseek',
                    providerId: 'deepseek-flash',
                    mode: 'chat',
                    endpoint: 'https://api.deepseek.com/v1',
                    endpointFingerprint: 'historical'
                }
            }
        })
        const changed = model('a', {
            providerId: 'deepseek-v4-pro',
            pricing: { input: 99, output: 99 }
        })
        expect(withEstimatedCost(legacy, changed).metrics.cost).toBeCloseTo(
            0.00000924,
            12
        )
        legacy.requestSnapshot!.model.pricing = {
            input: 2,
            output: 4,
            cacheRead: 0.2
        }
        expect(withEstimatedCost(legacy, changed).metrics.cost).toBeCloseTo(
            0.000096,
            12
        )
        delete legacy.requestSnapshot!.model.pricing
        legacy.requestSnapshot!.model.endpoint = 'https://proxy.test/v1'
        expect(withEstimatedCost(legacy, changed)).toBe(legacy)
    })
    it('recognizes DeepSeek cache hits despite the SDK synthesizing zero', () => {
        expect(
            normalizeUsage({
                inputTokens: 100,
                outputTokens: 10,
                inputTokenDetails: { cacheReadTokens: 0 },
                raw: {
                    prompt_tokens: 100,
                    completion_tokens: 10,
                    prompt_cache_hit_tokens: 80,
                    prompt_cache_miss_tokens: 20
                }
            })
        ).toMatchObject({ inputTokens: 100, cacheReadTokens: 80 })
    })
    it('keeps missing usage, cache and cost unknown instead of synthetic zeros', () => {
        const usage = normalizeUsage({
            inputTokens: 0,
            outputTokens: 0,
            inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 0 },
            raw: {}
        })
        expect(usage).toMatchObject({
            inputTokens: undefined,
            outputTokens: undefined,
            cacheReadTokens: undefined,
            cacheWriteTokens: undefined
        })
        expect(
            usageMetrics(usage, { input: 2, output: 4 }).cost
        ).toBeUndefined()
        expect(cacheHitRate(usage)).toBeUndefined()
    })
    it('uses the SDK Anthropic input total without adding cache usage twice', () => {
        const usage = normalizeUsage({
            inputTokens: 100,
            outputTokens: 10,
            raw: {
                input_tokens: 20,
                output_tokens: 10,
                cache_read_input_tokens: 70,
                cache_creation_input_tokens: 10
            }
        })
        expect(
            usageMetrics(usage, {
                input: 2,
                output: 4,
                cacheRead: 0.2,
                cacheWrite: 2.5
            })
        ).toMatchObject({
            inputTokens: 100,
            cacheReadTokens: 70,
            cacheWriteTokens: 10,
            costSource: 'estimated'
        })
        expect(
            usageMetrics(usage, {
                input: 2,
                output: 4,
                cacheRead: 0.2,
                cacheWrite: 2.5
            }).cost
        ).toBeCloseTo(0.000119, 12)
        expect(cacheHitRate(usage)).toBe(70)
    })
    it('recognizes standard OpenAI and Gemini cache data including explicit zero', () => {
        expect(
            normalizeUsage({
                inputTokens: 100,
                raw: {
                    prompt_tokens_details: {
                        cached_tokens: 0,
                        cache_write_tokens: 40
                    }
                }
            })
        ).toMatchObject({ cacheReadTokens: 0, cacheWriteTokens: 40 })
        expect(
            normalizeUsage({
                inputTokens: 120,
                outputTokens: 5,
                raw: {
                    promptTokenCount: 100,
                    cachedContentTokenCount: 50,
                    candidatesTokenCount: 5
                }
            })
        ).toMatchObject({ inputTokens: 120, cacheReadTokens: 50 })
        expect(
            normalizeUsage({
                raw: {
                    input_tokens: 100,
                    input_tokens_details: { cached_tokens: 80 }
                }
            })
        ).toMatchObject({ inputTokens: 100, cacheReadTokens: 80 })
    })
    it('prefers billed zero or positive costs over configured prices', () => {
        for (const cost of [0, 0.0001]) {
            expect(
                usageMetrics(
                    normalizeUsage({
                        inputTokens: 100,
                        outputTokens: 10,
                        raw: { cost }
                    }),
                    { input: 999, output: 999 }
                )
            ).toMatchObject({ cost, costSource: 'api' })
        }
    })
    it('falls back to ordinary input prices when cache prices are absent', () => {
        expect(
            usageMetrics(
                { inputTokens: 100, outputTokens: 10, cacheReadTokens: 80 },
                { input: 2, output: 4 }
            ).cost
        ).toBeCloseTo(0.00024, 12)
        expect(
            usageMetrics({ outputTokens: 10 }, { input: 2, output: 4 }).cost
        ).toBeUndefined()
    })
    it('rejects negative, fractional and inconsistent cache counts', () => {
        for (const cacheReadTokens of [-1, NaN, 1.5, 101]) {
            expect(
                usageMetrics({ inputTokens: 100, cacheReadTokens })
                    .cacheReadTokens
            ).toBeUndefined()
        }
        expect(
            usageMetrics({
                inputTokens: 100,
                cacheReadTokens: 90,
                cacheWriteTokens: 20
            })
        ).toMatchObject({
            cacheReadTokens: undefined,
            cacheWriteTokens: undefined
        })
        expect(
            cacheHitRate({ inputTokens: 0, cacheReadTokens: 0 })
        ).toBeUndefined()
    })
    it('weights aggregate cache rate by input tokens and exposes incomplete coverage', () => {
        const aggregate = summarizeUsage([
            result().metrics,
            {
                ...result().metrics,
                inputTokens: 1000,
                cacheReadTokens: 900,
                cost: 0.001,
                costSource: 'api'
            },
            {
                ...result().metrics,
                inputTokens: 100,
                cacheReadTokens: 10,
                cost: 0.0002,
                costSource: 'estimated'
            },
            { ...result().metrics, cost: 0, costSource: 'api' }
        ])
        expect(aggregate).toMatchObject({
            inputTokens: 1100,
            cacheReadTokens: 910,
            costSource: 'estimated',
            cacheSamples: 2,
            costSamples: 3,
            totalSamples: 4
        })
        expect(aggregate.cost).toBeCloseTo(0.0012, 12)
        expect(cacheHitRate(aggregate)).toBeCloseTo(82.727, 3)
        expect(summarizeUsage([]).cost).toBeUndefined()
        expect(
            summarizeUsage([
                { ...result().metrics, cost: 0, costSource: 'api' }
            ])
        ).toMatchObject({ cost: 0, costSource: 'api' })
    })
    it('formats unknown, free and sub-cent amounts distinctly', () => {
        expect(formatUsageCost(undefined)).toBe('—')
        expect(formatUsageCost(0)).toBe('$0.00')
        expect(formatUsageCost(0.00000018)).toBe('$0.00000018')
        expect(formatUsageCost(1e-10)).toBe('$1.00e-10')
    })
    it('preserves usage and cache pricing through backup validation and public reports', () => {
        const pricing = { input: 2, output: 4, cacheRead: 0.2, cacheWrite: 2.5 }
        const recorded = result('cached', {
            metrics: {
                ...result().metrics,
                ...usageMetrics(
                    {
                        inputTokens: 100,
                        outputTokens: 10,
                        cacheReadTokens: 70,
                        cacheWriteTokens: 10
                    },
                    pricing
                )
            }
        })
        const restored = parseBackup(
            JSON.parse(
                JSON.stringify({
                    models: [model('a', { pricing })],
                    sessions: [session({ a: [recorded] })]
                })
            )
        )
        expect(restored.models?.[0].pricing).toEqual(pricing)
        expect(restored.sessions?.[0].results.a[0].metrics).toEqual(
            recorded.metrics
        )
        const report = buildReportDocument(
            {
                source: 'arena',
                models: restored.models!,
                sessions: restored.sessions!,
                filter: {}
            },
            { includeContent: false, includeReasoning: false },
            123
        )
        expect(report.records[0]).toMatchObject({
            cacheReadTokens: 70,
            cacheWriteTokens: 10,
            costSource: 'estimated'
        })
    })
})
