import { describe, expect, it } from 'vitest'
import { model, result, session } from '@/test/fixtures'
import { aggregateStatistics, selectStatisticsResults } from './statistics'
import { percentile, summarizeModelResults } from '@/lib/statistics'
import { csvCell, exportStatsCSV } from './export'
import { captureModelSnapshot } from '@/features/benchmark/snapshots'
import { resolveGenerationConfig } from '@/lib/generation-config'
import { providerGroupKey } from '@/lib/providers/catalog'
import { buildReportDocument } from './report'

describe('benchmark reporting', () => {
    it('uses per-request identities after model edits or deletion, including filters and reports', async () => {
        const chat = model('a', {
            name: 'Original chat',
            provider: 'openai',
            providerId: 'gpt-4o',
            mode: 'chat'
        })
        const decision = model('a', {
            name: 'Jev decision',
            provider: 'openrouter',
            providerId: 'typesafe/jev-1.13',
            mode: 'decision',
            decisionProtocol: 'system-one'
        })
        const parameters = resolveGenerationConfig({
            temperature: 0,
            maxTokens: 100,
            topP: 1
        })
        const frozen = async (value: typeof chat) => ({
            schemaVersion: 1 as const,
            model: await captureModelSnapshot(value),
            parameters,
            context: 'independent' as const,
            capturedAt: 1
        })
        const sessions = [
            session({
                a: [
                    result('chat', { requestSnapshot: await frozen(chat) }),
                    result('decision', {
                        requestSnapshot: await frozen(decision),
                        metrics: {
                            ttft: 0,
                            tps: 0,
                            totalDuration: 80,
                            tokenCount: 30
                        }
                    })
                ]
            })
        ]
        const live = model('a', {
            name: 'Renamed',
            provider: 'google',
            mode: 'image'
        })
        const stats = aggregateStatistics([live], sessions)
        expect(stats.modelStats).toHaveLength(2)
        expect(stats.modelStats[0]).toMatchObject({
            id: 'a',
            name: 'Original chat',
            provider: 'OpenAI',
            mode: 'chat',
            avgTPS: 20
        })
        expect(stats.modelStats[1]).toMatchObject({
            id: 'a',
            name: 'Jev decision',
            provider: 'OpenRouter',
            mode: 'decision',
            speedSampleCount: 0,
            latencySampleCount: 0,
            avgDuration: 80
        })
        expect(new Set(stats.modelStats.map((row) => row.groupKey)).size).toBe(
            2
        )
        expect(aggregateStatistics([], sessions).modelStats).toEqual(
            stats.modelStats
        )
        expect(
            selectStatisticsResults([live], sessions, {
                mode: 'chat',
                providerKey: providerGroupKey(chat)
            }).map((entry) => entry.result.id)
        ).toEqual(['chat'])
        const report = buildReportDocument(
            {
                source: 'arena',
                models: [live],
                sessions,
                filter: { mode: 'decision' }
            },
            { includeContent: false, includeReasoning: false },
            1
        )
        expect(report.modelComparison).toHaveLength(1)
        expect(report.modelComparison[0]).toMatchObject({
            name: 'Jev decision',
            mode: 'decision'
        })
        expect(report.records.map((entry) => entry.resultId)).toEqual([
            'decision'
        ])
        expect(JSON.stringify(report)).not.toContain('groupKey')
    })
    it('keeps frozen endpoints and model IDs separate, while legacy records use the current configuration', async () => {
        const original = model('a', {
            baseURL: 'https://example.test/v1?tenant=one'
        })
        const updated = model('a', {
            baseURL: 'https://example.test/v1?tenant=two',
            providerId: 'new-model'
        })
        const parameters = resolveGenerationConfig({
            temperature: 0,
            maxTokens: 100,
            topP: 1
        })
        const oldSnapshot = await captureModelSnapshot(original)
        const newSnapshot = await captureModelSnapshot(updated)
        const request = (snapshot: typeof oldSnapshot) => ({
            schemaVersion: 1 as const,
            model: snapshot,
            parameters,
            context: 'conversation' as const,
            capturedAt: 1
        })
        const sessions = [
            session({
                a: [
                    result('old', { requestSnapshot: request(oldSnapshot) }),
                    result('new', { requestSnapshot: request(newSnapshot) }),
                    result('legacy')
                ]
            })
        ]
        expect(
            aggregateStatistics([updated], sessions).modelStats
        ).toHaveLength(3)
        expect(
            selectStatisticsResults([updated], sessions).at(-1)?.model
                .providerId
        ).toBe('new-model')
        expect(
            JSON.stringify(aggregateStatistics([updated], sessions).modelStats)
        ).not.toContain('tenant=')
    })
    it('weights global speed by request samples and excludes failures and pending runs', () => {
        const report = aggregateStatistics(
            [model('a'), model('b')],
            [
                session({
                    a: [
                        ...Array.from({ length: 9 }, (_, index) =>
                            result(String(index))
                        ),
                        result('failure', {
                            status: 'error',
                            error: 'Failed',
                            metrics: {
                                tps: 9000,
                                ttft: 1,
                                tokenCount: 9999,
                                totalDuration: 1
                            }
                        }),
                        result('pending', { response: '', status: 'pending' })
                    ],
                    b: [
                        result('b', {
                            modelId: 'b',
                            metrics: {
                                tps: 100,
                                ttft: 200,
                                totalDuration: 1000,
                                tokenCount: 18
                            }
                        })
                    ]
                })
            ]
        )
        expect(report.avgGlobalTPS).toBe(28)
        expect(report.completedCount).toBe(10)
        expect(report.errorCount).toBe(1)
        expect(report.totalTokensAcrossModels).toBe(180)
        expect(report.totalMessages).toBe(12)
        expect(report.successRate).toBeCloseTo((10 / 11) * 100)
    })
    it('tracks image successes and historical removed models without false speed winners', () => {
        const report = aggregateStatistics(
            [model('image', { mode: 'image' })],
            [
                session({
                    image: [
                        result('image', {
                            modelId: 'image',
                            metrics: {
                                tps: 0,
                                ttft: 500,
                                totalDuration: 500,
                                tokenCount: 0
                            }
                        })
                    ],
                    removed: [result('old', { modelId: 'removed' })]
                })
            ]
        )
        expect(report.completedCount).toBe(2)
        expect(
            report.modelStats.find((stat) => stat.id === 'image')
                ?.speedSampleCount
        ).toBe(0)
        expect(report.topTPSModel?.id).toBe('removed')
    })
    it('filters on result timestamp, provider endpoint and model mode', () => {
        const models = [model('a'), model('b', { mode: 'image' })]
        const report = aggregateStatistics(
            models,
            [
                session({
                    a: [result('old'), result('new', { timestamp: 3000 })],
                    b: [result('b', { modelId: 'b', timestamp: 3000 })]
                })
            ],
            { since: 2000, mode: 'chat' }
        )
        expect(report.totalMessages).toBe(1)
        expect(report.totalSessions).toBe(1)
    })
    it('handles invalid values, zero latency, missing prices and percentile edge cases', () => {
        const report = aggregateStatistics(
            [model()],
            [
                session({
                    a: [
                        result('bad', {
                            metrics: {
                                tps: NaN,
                                ttft: 0,
                                totalDuration: Infinity,
                                tokenCount: 0
                            }
                        })
                    ]
                })
            ]
        )
        expect(report.avgGlobalTPS).toBe(0)
        expect(report.fastestModel).toBeUndefined()
        expect(report.costSampleCount).toBe(0)
        expect(percentile([], 0.95)).toBe(0)
        expect(percentile([10, 100, 30, 20], 0.5)).toBe(20)
        expect(percentile([10, 100, 30, 20], 0.95)).toBe(100)
    })
    it('exports expanded metrics, quoted names and safe CSV cells', () => {
        const stats = aggregateStatistics(
            [model('a', { name: '=SUM(1,2)' })],
            [session({ a: [result()] })]
        ).modelStats
        const csv = exportStatsCSV(stats)
        expect(csv).toContain("'=SUM(1,2)")
        expect(csvCell('Hello "world"')).toBe('"Hello ""world"""')
    })
    it('classifies speed samples strictly by token source', () => {
        const stat = summarizeModelResults(model('a'), [
            result('api', { metrics: { ...result().metrics, tps: 30 } }),
            result('est', {
                metrics: {
                    ...result().metrics,
                    tps: 10,
                    tokenSource: 'estimated' as const
                }
            }),
            result('unknown', {
                metrics: {
                    ttft: 100,
                    tps: 5,
                    totalDuration: 1000,
                    tokenCount: 18
                }
            }),
            result('zero', { metrics: { ...result().metrics, tps: 0 } })
        ])
        expect(stat.speedSampleCount).toBe(3)
        expect(stat.avgTPS).toBe(15)
        expect(stat.apiAvgTPS).toBe(30)
        expect(stat.apiSpeedSampleCount).toBe(1)
        expect(stat.estimatedAvgTPS).toBe(10)
        expect(stat.estimatedSpeedSampleCount).toBe(1)
        expect(stat.unknownSpeedSampleCount).toBe(1)
    })
    it('computes duration percentiles with nearest-rank coverage', () => {
        const durations = [400, 100, 300, 200]
        const stat = summarizeModelResults(
            model('a'),
            durations.map((totalDuration, index) =>
                result(`r${index}`, {
                    metrics: { ...result().metrics, totalDuration }
                })
            )
        )
        expect(stat.durationSampleCount).toBe(4)
        expect(stat.medianDuration).toBe(200)
        expect(stat.p95Duration).toBe(400)
    })
    it('keeps human, rule and AI quality denominators separate', () => {
        const judgeEvaluation = {
            judgeCallId: 'jc1',
            accuracy: 5,
            instructionFollowing: 3,
            completeness: 1,
            rationale: 'solid',
            judge: {
                id: 'judge',
                name: 'Judge',
                provider: 'openai' as const,
                mode: 'chat' as const,
                endpointFingerprint: 'a'.repeat(64)
            },
            judgeConfig: {},
            judgePrompt: 'Rate these',
            judgedAt: 1
        }
        const stat = summarizeModelResults(model('a'), [
            result('human', { rating: 4, ratingSource: 'human' }),
            result('ai', {
                rating: 2,
                ratingSource: 'ai',
                judgeEvaluation,
                ruleEvaluation: { type: 'exact', passed: true, evaluatedAt: 1 }
            }),
            result('rule-fail', {
                ruleEvaluation: { type: 'exact', passed: false, evaluatedAt: 1 }
            })
        ])
        expect(stat.avgRating).toBe(3)
        expect(stat.ratingCount).toBe(2)
        expect(stat.humanAvgRating).toBe(4)
        expect(stat.humanRatingCount).toBe(1)
        expect(stat.rulePassedCount).toBe(1)
        expect(stat.ruleEvaluatedCount).toBe(2)
        expect(stat.rulePassRate).toBe(50)
        expect(stat.aiAccuracyMean).toBe(5)
        expect(stat.aiInstructionFollowingMean).toBe(3)
        expect(stat.aiCompletenessMean).toBe(1)
        expect(stat.aiRatingCount).toBe(1)
    })
    it('selects filtered results with session attribution and removed-model fallback', () => {
        const selected = selectStatisticsResults(
            [model('a')],
            [
                session(
                    {
                        a: [
                            result('old', { timestamp: 500 }),
                            result('new', { timestamp: 3000 })
                        ],
                        gone: [result('x', { modelId: 'gone' })]
                    },
                    { id: 's1' }
                ),
                session({ a: [result('y', { timestamp: 3000 })] }, { id: 's2' })
            ],
            { since: 1000 }
        )
        expect(selected.map((entry) => entry.result.id)).toEqual([
            'new',
            'x',
            'y'
        ])
        expect(
            selected.every(
                (entry) =>
                    entry.sessionId === (entry.result.id === 'y' ? 's2' : 's1')
            )
        ).toBe(true)
        const removed = selected.find(
            (entry) => entry.model.id === 'gone'
        )!.model
        expect(removed.name).toBe('gone (removed)')
        expect(removed.enabled).toBe(false)
    })
})
