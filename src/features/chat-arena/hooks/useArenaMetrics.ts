import { useMemo } from 'react'
import { LLMModel, BenchmarkResult, BenchmarkMetrics } from '@/lib/types'

export interface MetricsRanges {
    ttft: { min: number; max: number }
    tps: { min: number; max: number }
    duration: { min: number; max: number }
}

export interface AggregateMetrics {
    modelId: string
    avgTtft: number
    avgTps: number
    sumTime: number
    sumToks: number
    avgRating: number
}

export interface FooterRanges {
    ttft: { min: number; max: number }
    tps: { min: number; max: number }
    duration: { min: number; max: number }
    tokens: { min: number; max: number }
}

export function useArenaMetrics(
    activeModels: LLMModel[],
    activeSession: { results: Record<string, BenchmarkResult[]> } | undefined,
    streamingData: Record<string, { metrics?: Partial<BenchmarkMetrics> }>,
    arenaSortBy: string
) {
    const metricsRanges: MetricsRanges = useMemo(() => {
        const allLastMetrics = activeModels
            .map((model) => {
                const results = activeSession?.results[model.id] || []
                const lastRes = results[results.length - 1]
                if (!lastRes) return undefined
                const streaming = streamingData[lastRes.id]
                return streaming?.metrics
                    ? { ...lastRes.metrics, ...streaming.metrics }
                    : lastRes.metrics
            })
            .filter((m): m is NonNullable<typeof m> => !!m)

        const ttftValues = allLastMetrics
            .map((m) => m.ttft)
            .filter((v) => v > 0)
        const tpsValues = allLastMetrics.map((m) => m.tps).filter((v) => v > 0)
        const durationValues = allLastMetrics
            .map((m) => m.totalDuration)
            .filter((v) => v > 0)

        return {
            ttft: {
                min: Math.min(...(ttftValues.length ? ttftValues : [0])),
                max: Math.max(...(ttftValues.length ? ttftValues : [0]))
            },
            tps: {
                min: Math.min(...(tpsValues.length ? tpsValues : [0])),
                max: Math.max(...(tpsValues.length ? tpsValues : [0]))
            },
            duration: {
                min: Math.min(
                    ...(durationValues.length ? durationValues : [0])
                ),
                max: Math.max(...(durationValues.length ? durationValues : [0]))
            }
        }
    }, [activeModels, activeSession, streamingData])

    const aggregateMetrics: AggregateMetrics[] = useMemo(() => {
        return activeModels.map((model) => {
            const results = activeSession?.results[model.id] || []
            const valid = results
                .map((r) => {
                    const s = streamingData[r.id]
                    return s?.metrics
                        ? { ...r, metrics: { ...r.metrics, ...s.metrics } }
                        : r
                })
                .filter((r) => r.metrics && !r.error)

            const ratedResults = results.filter((r) => r.rating)
            const avgRating =
                ratedResults.length > 0
                    ? ratedResults.reduce((a, b) => a + (b.rating || 0), 0) /
                      ratedResults.length
                    : 0

            return {
                modelId: model.id,
                avgTtft:
                    valid.length > 0
                        ? valid.reduce(
                              (a, b) => a + (b.metrics?.ttft || 0),
                              0
                          ) / valid.length
                        : 0,
                avgTps:
                    valid.length > 0
                        ? valid.reduce((a, b) => a + (b.metrics?.tps || 0), 0) /
                          valid.length
                        : 0,
                sumTime: valid.reduce(
                    (a, b) => a + (b.metrics?.totalDuration || 0),
                    0
                ),
                sumToks: valid.reduce(
                    (a, b) => a + (b.metrics?.tokenCount || 0),
                    0
                ),
                avgRating
            }
        })
    }, [activeModels, activeSession, streamingData])

    const displayModels = useMemo(() => {
        const models = [...activeModels]
        if (arenaSortBy !== 'default') {
            models.sort((a, b) => {
                const mA = aggregateMetrics.find((m) => m.modelId === a.id)
                const mB = aggregateMetrics.find((m) => m.modelId === b.id)
                if (arenaSortBy === 'name') return a.name.localeCompare(b.name)
                if (arenaSortBy === 'ttft')
                    return (mA?.avgTtft || 999999) - (mB?.avgTtft || 999999)
                if (arenaSortBy === 'tps')
                    return (mB?.avgTps || 0) - (mA?.avgTps || 0)
                if (arenaSortBy === 'rating')
                    return (mB?.avgRating || 0) - (mA?.avgRating || 0)
                return 0
            })
        }
        return models
    }, [activeModels, aggregateMetrics, arenaSortBy])

    const footerRanges: FooterRanges = useMemo(() => {
        const fTtftVals = aggregateMetrics
            .map((a) => a.avgTtft)
            .filter((v) => v > 0)
        const fTpsVals = aggregateMetrics
            .map((a) => a.avgTps)
            .filter((v) => v > 0)
        const fTimeVals = aggregateMetrics
            .map((a) => a.sumTime)
            .filter((v) => v > 0)
        const fToksVals = aggregateMetrics
            .map((a) => a.sumToks)
            .filter((v) => v > 0)

        return {
            ttft: {
                min: Math.min(...(fTtftVals.length ? fTtftVals : [0])),
                max: Math.max(...(fTtftVals.length ? fTtftVals : [0]))
            },
            tps: {
                min: Math.min(...(fTpsVals.length ? fTpsVals : [0])),
                max: Math.max(...(fTpsVals.length ? fTpsVals : [0]))
            },
            duration: {
                min: Math.min(...(fTimeVals.length ? fTimeVals : [0])),
                max: Math.max(...(fTimeVals.length ? fTimeVals : [0]))
            },
            tokens: {
                min: Math.min(...(fToksVals.length ? fToksVals : [0])),
                max: Math.max(...(fToksVals.length ? fToksVals : [0]))
            }
        }
    }, [aggregateMetrics])

    return {
        metricsRanges,
        aggregateMetrics,
        displayModels,
        footerRanges
    }
}
