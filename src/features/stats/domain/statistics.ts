import type { BenchmarkResult, ChatSession, LLMModel } from '@/lib/types'
import { providerGroupKey, providerLabel } from '@/lib/providers/catalog'

export interface ModelStat {
    id: string
    name: string
    provider: string
    providerKey: string
    mode: 'chat' | 'image'
    avgTPS: number
    avgTTFT: number
    avgRating: number
    avgDuration: number
    medianTTFT: number
    p95TTFT: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    totalCount: number
    completedCount: number
    errorCount: number
    cancelledCount: number
    pendingCount: number
    successRate: number
    totalCost: number
    costSampleCount: number
    estimatedCount: number
    speedSampleCount: number
    latencySampleCount: number
    ratingCount: number
}
export interface StatsFilter {
    since?: number
    providerKey?: string
    mode?: 'chat' | 'image'
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
const positive = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
const nonnegative = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
const average = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
export function percentile(values: number[], fraction: number) {
    if (!values.length) return 0
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}
export function resultStatus(result: BenchmarkResult) {
    return (
        result.status ||
        (result.error ? 'error' : result.response ? 'completed' : 'pending')
    )
}

function summarize(model: LLMModel, results: BenchmarkResult[]): ModelStat {
    const successful = results.filter(
        (r) => resultStatus(r) === 'completed' && !r.error
    )
    const speeds =
        model.mode === 'image'
            ? []
            : successful.map((r) => r.metrics?.tps).filter(positive)
    const latencies = successful.map((r) => r.metrics?.ttft).filter(positive)
    const durations = successful
        .map((r) => r.metrics?.totalDuration)
        .filter(positive)
    const ratings = successful
        .map((r) => r.rating)
        .filter(positive)
        .filter((v) => v <= 5)
    const errorCount = results.filter(
        (r) =>
            resultStatus(r) === 'error' ||
            (r.error && resultStatus(r) !== 'cancelled')
    ).length
    const cancelledCount = results.filter(
        (r) => resultStatus(r) === 'cancelled'
    ).length
    const costs = successful.map((r) => r.metrics?.cost).filter(nonnegative)
    const finished = successful.length + errorCount + cancelledCount
    return {
        id: model.id,
        name: model.name,
        provider: providerLabel(model),
        providerKey: providerGroupKey(model),
        mode: model.mode || 'chat',
        avgTPS: average(speeds),
        avgTTFT: average(latencies),
        avgDuration: average(durations),
        avgRating: average(ratings),
        medianTTFT: percentile(latencies, 0.5),
        p95TTFT: percentile(latencies, 0.95),
        totalTokens: successful.reduce(
            (sum, r) =>
                sum +
                (nonnegative(r.metrics?.tokenCount) ? r.metrics.tokenCount : 0),
            0
        ),
        inputTokens: successful.reduce(
            (sum, r) =>
                sum +
                (nonnegative(r.metrics?.inputTokens)
                    ? r.metrics.inputTokens
                    : 0),
            0
        ),
        outputTokens: successful.reduce(
            (sum, r) =>
                sum +
                (nonnegative(r.metrics?.outputTokens)
                    ? r.metrics.outputTokens
                    : 0),
            0
        ),
        totalCount: results.length,
        completedCount: successful.length,
        errorCount,
        cancelledCount,
        pendingCount: results.length - finished,
        successRate: finished ? (successful.length / finished) * 100 : 0,
        totalCost: costs.reduce((sum, cost) => sum + cost, 0),
        costSampleCount: costs.length,
        estimatedCount:
            model.mode === 'image'
                ? 0
                : successful.filter(
                      (r) =>
                          r.metrics?.tokenSource === 'estimated' ||
                          r.metrics?.outputTokens === undefined
                  ).length,
        speedSampleCount: speeds.length,
        latencySampleCount: latencies.length,
        ratingCount: ratings.length
    }
}

export function aggregateStatistics(
    models: LLMModel[],
    sessions: ChatSession[],
    filter: StatsFilter = {}
) {
    const knownModels = new Map(models.map((model) => [model.id, model]))
    const resultsByModel = new Map<string, BenchmarkResult[]>()
    const sessionIds = new Set<string>()
    for (const session of sessions) {
        for (const [modelId, results] of Object.entries(session.results)) {
            let model = knownModels.get(modelId)
            if (!model) {
                model = {
                    id: modelId,
                    name: `${modelId} (removed)`,
                    provider: 'other',
                    providerName: 'Removed provider',
                    enabled: false
                }
                knownModels.set(modelId, model)
            }
            if (
                filter.providerKey &&
                filter.providerKey !== providerGroupKey(model)
            )
                continue
            if (filter.mode && filter.mode !== (model.mode || 'chat')) continue
            const selected = results.filter(
                (result) => !filter.since || result.timestamp >= filter.since
            )
            if (!selected.length) continue
            const entries = resultsByModel.get(modelId) || []
            for (const result of selected) entries.push(result)
            resultsByModel.set(modelId, entries)
            sessionIds.add(session.id)
        }
    }
    const modelStats = [...resultsByModel].map(([id, results]) =>
        summarize(knownModels.get(id)!, results)
    )
    const totalMessages = modelStats.reduce(
        (sum, stat) => sum + stat.totalCount,
        0
    )
    const speedSamples = modelStats.reduce(
        (sum, stat) => sum + stat.speedSampleCount,
        0
    )
    const completedCount = modelStats.reduce(
        (sum, stat) => sum + stat.completedCount,
        0
    )
    const errorCount = modelStats.reduce(
        (sum, stat) => sum + stat.errorCount,
        0
    )
    const cancelledCount = modelStats.reduce(
        (sum, stat) => sum + stat.cancelledCount,
        0
    )
    const finished = completedCount + errorCount + cancelledCount
    const topTPSModel = modelStats
        .filter((s) => s.speedSampleCount > 0)
        .sort((a, b) => b.avgTPS - a.avgTPS)[0]
    const topRatingModel = modelStats
        .filter((s) => s.ratingCount > 0)
        .sort((a, b) => b.avgRating - a.avgRating)[0]
    const fastestModel = modelStats
        .filter((s) => s.latencySampleCount > 0)
        .sort((a, b) => a.avgTTFT - b.avgTTFT)[0]
    return {
        modelStats,
        totalSessions: sessionIds.size,
        totalMessages,
        completedCount,
        errorCount,
        cancelledCount,
        successRate: finished ? (completedCount / finished) * 100 : 0,
        totalTokensAcrossModels: modelStats.reduce(
            (sum, s) => sum + s.totalTokens,
            0
        ),
        avgGlobalTPS: speedSamples
            ? modelStats.reduce(
                  (sum, s) => sum + s.avgTPS * s.speedSampleCount,
                  0
              ) / speedSamples
            : 0,
        totalCost: modelStats.reduce((sum, s) => sum + s.totalCost, 0),
        costSampleCount: modelStats.reduce(
            (sum, s) => sum + s.costSampleCount,
            0
        ),
        estimatedCount: modelStats.reduce(
            (sum, s) => sum + s.estimatedCount,
            0
        ),
        topTPSModel,
        topRatingModel,
        fastestModel
    }
}
