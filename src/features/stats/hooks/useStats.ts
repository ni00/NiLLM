import { useAppStore } from '@/lib/store'
import { useState, useEffect, useMemo } from 'react'

export interface ModelStat {
    id: string
    name: string
    provider: string
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
    const { sessions, models, clearModelResults, clearSessions } = useAppStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100)
        return () => clearTimeout(timer)
    }, [])

    const modelStats: ModelStat[] = useMemo(() => {
        return models
            .map((model) => {
                let totalTPS = 0
                let tpsCount = 0
                let totalTTFT = 0
                let ttftCount = 0
                let totalCount = 0
                let totalRating = 0
                let ratingCount = 0
                let totalTokens = 0

                sessions.forEach((session) => {
                    const results = session.results[model.id] || []
                    results.forEach((r) => {
                        totalCount++
                        if (r.metrics?.tps > 0) {
                            totalTPS += r.metrics.tps
                            tpsCount++
                        }
                        if (r.metrics?.ttft > 0) {
                            totalTTFT += r.metrics.ttft
                            ttftCount++
                        }
                        if (r.metrics?.tokenCount > 0) {
                            totalTokens += r.metrics.tokenCount
                        }
                        if (r.rating) {
                            totalRating += r.rating
                            ratingCount++
                        }
                    })
                })

                const avgTPS = tpsCount > 0 ? totalTPS / tpsCount : 0
                const avgTTFT = ttftCount > 0 ? totalTTFT / ttftCount : 0
                const avgRating =
                    ratingCount > 0 ? totalRating / ratingCount : 0

                return {
                    id: model.id,
                    name: model.name,
                    provider: model.providerName || model.provider,
                    avgTPS,
                    avgTTFT,
                    avgRating,
                    totalTokens,
                    totalCount,
                    completedCount: tpsCount
                }
            })
            .filter((s) => s.totalCount > 0)
    }, [models, sessions])

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
            latency: parseFloat(s.avgTTFT.toFixed(0)),
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
