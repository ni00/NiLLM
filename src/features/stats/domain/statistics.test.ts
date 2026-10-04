import { describe, expect, it } from 'vitest'
import { model, result, session } from '@/test/fixtures'
import { aggregateStatistics, percentile } from './statistics'
import { csvCell, exportStatsCSV } from './export'

describe('benchmark reporting', () => {
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
        expect(csv).toContain('P95 TTFT (ms)')
        expect(csv).toContain('Priced samples')
        expect(csv).toContain("'=SUM(1,2)")
        expect(csvCell('Hello "world"')).toBe('"Hello ""world"""')
    })
})
