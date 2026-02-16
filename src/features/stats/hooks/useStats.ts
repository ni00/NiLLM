import { useState, useEffect, useMemo } from 'react'
import type { BenchmarkResult } from '@/lib/types'
import {
    useSessions,
    useModels,
    useClearModelResults,
    useClearSessions
} from '@/lib/hooks/useStoreSelectors'

export interface ModelStat {
    id: string
    name: string
    provider: string
    mode?: 'chat' | 'image'
    avgTPS: number
    avgTTFT: number
    avgRating: number
    totalTokens: number
    totalCount: number
    completedCount: number
}

export interface ChartDataPoint {
    name: string
    speed: number
    latency: number
    rating: number
    tokens: number
}

export interface RadarDataPoint {
    subject: string
    Speed: number
    Quality: number
    Responsiveness: number
}

export function useStats() {
    const sessions = useSessions()
    const models = useModels()
    const clearModelResults = useClearModelResults()
    const clearSessions = useClearSessions()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100)
        return () => clearTimeout(timer)
    }, [])

    // Pre-aggregate results by model ID to avoid O(n²) nested loops
    const resultsByModel = useMemo(() => {
        const map = new Map<string, BenchmarkResult[]>()
        sessions.forEach((session) => {
            Object.entries(session.results).forEach(([modelId, results]) => {
                if (!map.has(modelId)) map.set(modelId, [])
                map.get(modelId)!.push(...results)
            })
        })
        return map
    }, [sessions])

    const modelStats: ModelStat[] = useMemo(() => {
        return models
            .map((model) => {
                const results = resultsByModel.get(model.id) || []

                // Single-pass aggregation
                const stats = results.reduce(
                    (acc, r) => {
                        acc.totalCount++
                        if (r.metrics?.tps > 0) {
                            acc.totalTPS += r.metrics.tps
                            acc.tpsCount++
                        }
                        if (r.metrics?.ttft > 0) {
                            acc.totalTTFT += r.metrics.ttft
                            acc.ttftCount++
                        }
                        if (r.metrics?.tokenCount > 0) {
                            acc.totalTokens += r.metrics.tokenCount
                        }
                        if (r.rating) {
                            acc.totalRating += r.rating
                            acc.ratingCount++
                        }
                        return acc
                    },
                    {
                        totalTPS: 0,
                        tpsCount: 0,
                        totalTTFT: 0,
                        ttftCount: 0,
                        totalCount: 0,
                        totalRating: 0,
                        ratingCount: 0,
                        totalTokens: 0
                    }
                )

                const avgTPS =
                    stats.tpsCount > 0 ? stats.totalTPS / stats.tpsCount : 0
                const avgTTFT =
                    stats.ttftCount > 0 ? stats.totalTTFT / stats.ttftCount : 0
                const avgRating =
                    stats.ratingCount > 0
                        ? stats.totalRating / stats.ratingCount
                        : 0

                return {
                    id: model.id,
                    name: model.name,
                    provider: model.providerName || model.provider,
                    mode: model.mode || 'chat',
                    avgTPS,
                    avgTTFT,
                    avgRating,
                    totalTokens: stats.totalTokens,
                    totalCount: stats.totalCount,
                    completedCount: stats.tpsCount
                }
            })
            .filter((s) => s.totalCount > 0)
    }, [models, resultsByModel])

    const aggregatedStats = useMemo(() => {
        const totalSessions = sessions.length
        const totalMessages = sessions.reduce(
            (acc, s) => acc + s.messages.length,
            0
        )
        const totalTokensAcrossModels = modelStats.reduce(
            (acc, s) => acc + s.totalTokens,
            0
        )
        const avgGlobalTPS =
            modelStats.length > 0
                ? modelStats.reduce((acc, s) => acc + s.avgTPS, 0) /
                  modelStats.length
                : 0

        const topTPSModel = [...modelStats].sort(
            (a, b) => b.avgTPS - a.avgTPS
        )[0]
        const topRatingModel = [...modelStats].sort(
            (a, b) => b.avgRating - a.avgRating
        )[0]
        const fastestModel = [...modelStats].sort(
            (a, b) => a.avgTTFT - b.avgTTFT
        )[0]

        return {
            totalSessions,
            totalMessages,
            totalTokensAcrossModels,
            avgGlobalTPS,
            topTPSModel,
            topRatingModel,
            fastestModel
        }
    }, [sessions, modelStats])

    const chartData: ChartDataPoint[] = useMemo(() => {
        return modelStats.map((s) => ({
            name: s.name,
            speed: parseFloat(s.avgTPS.toFixed(2)),
            latency: parseFloat(s.avgTTFT.toFixed(2)),
            rating: parseFloat(s.avgRating.toFixed(1)),
            tokens: s.totalTokens
        }))
    }, [modelStats])

    const radarData: RadarDataPoint[] = useMemo(() => {
        const maxTPS = Math.max(...modelStats.map((s) => s.avgTPS), 1)
        const maxRating = 5
        const minTTFT = Math.min(...modelStats.map((s) => s.avgTTFT), 100)

        return modelStats.map((s) => ({
            subject: s.name,
            Speed: (s.avgTPS / maxTPS) * 100,
            Quality: (s.avgRating / maxRating) * 100,
            Responsiveness: (minTTFT / Math.max(s.avgTTFT, 1)) * 100
        }))
    }, [modelStats])

    const maxTPS = useMemo(() => {
        return Math.max(...modelStats.map((s) => s.avgTPS), 1)
    }, [modelStats])

    return {
        mounted,
        modelStats,
        ...aggregatedStats,
        chartData,
        radarData,
        maxTPS,
        clearModelResults,
        clearSessions
    }
}
