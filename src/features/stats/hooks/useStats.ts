import { useMemo, useState } from 'react'
import {
    useSessions,
    useModels,
    useClearModelResults,
    useClearSessions
} from '@/lib/hooks/useStoreSelectors'
import {
    aggregateStatistics,
    type ChartDataPoint,
    type RadarDataPoint
} from '../domain/statistics'
import { groupModels } from '@/features/models/domain/models'
export type {
    ModelStat,
    ChartDataPoint,
    RadarDataPoint
} from '../domain/statistics'

export function useStats() {
    const sessions = useSessions(),
        models = useModels()
    const clearModelResults = useClearModelResults(),
        clearSessions = useClearSessions()
    const [range, setRange] = useState('all')
    const [providerKey, setProviderKey] = useState('all')
    const [mode, setMode] = useState<'all' | 'chat' | 'image'>('all')
    const [now] = useState(Date.now)
    const stats = useMemo(
        () =>
            aggregateStatistics(models, sessions, {
                since:
                    range === 'all'
                        ? undefined
                        : now - Number(range) * 86400000,
                providerKey: providerKey === 'all' ? undefined : providerKey,
                mode: mode === 'all' ? undefined : mode
            }),
        [models, sessions, range, providerKey, mode, now]
    )
    const { modelStats } = stats
    const providers = useMemo(() => groupModels(models), [models])
    const maxTPS = Math.max(...modelStats.map((s) => s.avgTPS), 1)
    const chartData: ChartDataPoint[] = useMemo(
        () =>
            [...modelStats]
                .sort((a, b) => b.avgTPS - a.avgTPS)
                .slice(0, 12)
                .map((s) => ({
                    name: `${s.name} · ${s.provider}`,
                    speed: s.avgTPS,
                    latency: s.avgTTFT,
                    rating: s.avgRating,
                    tokens: s.totalTokens
                })),
        [modelStats]
    )
    const radarData: RadarDataPoint[] = useMemo(() => {
        const valid = modelStats.filter(
            (s) => s.mode === 'chat' && s.completedCount > 0
        )
        const bestLatency = Math.min(
            ...valid.filter((s) => s.avgTTFT > 0).map((s) => s.avgTTFT)
        )
        return [...valid]
            .sort((a, b) => b.avgTPS - a.avgTPS)
            .slice(0, 8)
            .map((s) => ({
                subject: s.name,
                Speed: (s.avgTPS / maxTPS) * 100,
                Quality: (s.avgRating / 5) * 100,
                Responsiveness:
                    s.avgTTFT > 0 && Number.isFinite(bestLatency)
                        ? (bestLatency / s.avgTTFT) * 100
                        : 0
            }))
    }, [modelStats, maxTPS])
    return {
        ...stats,
        mounted: true,
        chartData,
        radarData,
        maxTPS,
        clearModelResults,
        clearSessions,
        range,
        setRange,
        providerKey,
        setProviderKey,
        mode,
        setMode,
        providers
    }
}
