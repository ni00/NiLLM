import { useMemo, useState } from 'react'
import {
    useSessions,
    useModels,
    useClearModelResults,
    useClearSessions
} from '@/lib/hooks/useStoreSelectors'
import {
    summarizeSelectedStatistics,
    selectStatisticsResults
} from '../domain/statistics'
import type { ChartDataPoint, RadarDataPoint } from '../display'
import type { ReportInput } from '../domain/report-types'
import { providerLabel } from '@/lib/providers/catalog'
export type { ModelStat } from '@/lib/statistics'

export function useStats() {
    const sessions = useSessions(),
        models = useModels()
    const clearModelResults = useClearModelResults(),
        clearSessions = useClearSessions()
    const [range, setRange] = useState('all')
    const [providerKey, setProviderKey] = useState('all')
    const [mode, setMode] = useState<'all' | 'chat' | 'image' | 'decision'>(
        'all'
    )
    const [now] = useState(Date.now)
    const filter = useMemo(
        () => ({
            since: range === 'all' ? undefined : now - Number(range) * 86400000,
            providerKey: providerKey === 'all' ? undefined : providerKey,
            mode: mode === 'all' ? undefined : mode
        }),
        [range, providerKey, mode, now]
    )
    const availableResults = useMemo(
        () => selectStatisticsResults(models, sessions),
        [models, sessions]
    )
    const stats = useMemo(
        () =>
            summarizeSelectedStatistics(
                availableResults.filter(
                    (entry) =>
                        (filter.since === undefined ||
                            entry.result.timestamp >= filter.since) &&
                        (filter.providerKey === undefined ||
                            entry.providerKey === filter.providerKey) &&
                        (filter.mode === undefined ||
                            (entry.model.mode ?? 'chat') === filter.mode)
                )
            ),
        [availableResults, filter]
    )
    const reportInput = useMemo<ReportInput>(
        () => ({ source: 'arena', models, sessions, filter }),
        [models, sessions, filter]
    )
    const { modelStats } = stats
    const providers = useMemo(() => {
        const groups = new Map<string, { key: string; label: string }>()
        for (const entry of availableResults) {
            if (!groups.has(entry.providerKey))
                groups.set(entry.providerKey, {
                    key: entry.providerKey,
                    label: providerLabel(entry.model)
                })
        }
        return [...groups.values()]
    }, [availableResults])
    const maxTPS = Math.max(...modelStats.map((s) => s.avgTPS), 1)
    const chartData: ChartDataPoint[] = useMemo(
        () =>
            modelStats.map((s) => ({
                id: s.groupKey ?? s.id,
                name: s.name,
                provider: s.provider,
                speed: s.speedSampleCount ? s.avgTPS : undefined,
                latency: s.latencySampleCount ? s.avgTTFT : undefined,
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
            .slice(0, 12)
            .map((s) => ({
                id: s.groupKey ?? s.id,
                subject: s.name,
                provider: s.provider,
                Speed: s.speedSampleCount
                    ? (s.avgTPS / maxTPS) * 100
                    : undefined,
                Quality: s.ratingCount ? (s.avgRating / 5) * 100 : undefined,
                Responsiveness:
                    s.avgTTFT > 0 && Number.isFinite(bestLatency)
                        ? (bestLatency / s.avgTTFT) * 100
                        : undefined
            }))
    }, [modelStats, maxTPS])
    return {
        ...stats,
        reportInput,
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
