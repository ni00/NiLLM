import type { BenchmarkResult, ChatSession, LLMModel } from '@/lib/types'
import { withEstimatedCost } from '@/lib/usage'
import { providerGroupKey } from '@/lib/providers/catalog'
import { sanitizeModels } from '@/lib/providers/export'
import { summarizeModelResults } from '@/lib/statistics'

export interface StatsFilter {
    since?: number
    providerKey?: string
    mode?: 'chat' | 'image' | 'decision'
}
export interface SelectedResult {
    sessionId: string
    model: LLMModel
    result: BenchmarkResult
    groupKey: string
    providerKey: string
}

export function selectStatisticsResults(
    models: LLMModel[],
    sessions: ChatSession[],
    filter: StatsFilter = {}
): SelectedResult[] {
    const knownModels = new Map(
        sanitizeModels(models).map((model) => [model.id, model])
    )
    const selected: SelectedResult[] = []
    for (const session of sessions) {
        for (const [modelId, results] of Object.entries(session.results)) {
            const fallback = knownModels.get(modelId) ?? {
                id: modelId,
                name: `${modelId} (removed)`,
                provider: 'other' as const,
                providerName: 'Removed provider',
                enabled: false
            }
            for (const result of results) {
                if (
                    filter.since !== undefined &&
                    result.timestamp < filter.since
                )
                    continue
                const snapshot = result.requestSnapshot?.model
                const model: LLMModel = snapshot
                    ? {
                          ...snapshot,
                          id: modelId,
                          baseURL: snapshot.endpoint,
                          enabled: false
                      }
                    : fallback
                const providerKey = providerGroupKey(model)
                if (filter.providerKey && filter.providerKey !== providerKey)
                    continue
                if (filter.mode && filter.mode !== (model.mode || 'chat'))
                    continue
                const groupKey = JSON.stringify([
                    modelId,
                    providerKey,
                    model.providerId ?? modelId,
                    model.mode ?? 'chat',
                    model.decisionProtocol ?? 'auto',
                    snapshot?.endpointFingerprint ?? 'legacy'
                ])
                selected.push({
                    sessionId: session.id,
                    model,
                    result: withEstimatedCost(result, model),
                    groupKey,
                    providerKey
                })
            }
        }
    }
    return selected
}

export function aggregateStatistics(
    models: LLMModel[],
    sessions: ChatSession[],
    filter: StatsFilter = {}
) {
    return summarizeSelectedStatistics(
        selectStatisticsResults(models, sessions, filter)
    )
}

export function summarizeSelectedStatistics(selected: SelectedResult[]) {
    const modelsById = new Map<string, LLMModel>()
    const resultsByModel = new Map<string, BenchmarkResult[]>()
    const sessionIds = new Set<string>()
    for (const { sessionId, model, result, groupKey } of selected) {
        // Keep the first historical label; renames do not rewrite old records.
        if (!modelsById.has(groupKey)) modelsById.set(groupKey, model)
        const entries = resultsByModel.get(groupKey) || []
        entries.push(result)
        resultsByModel.set(groupKey, entries)
        sessionIds.add(sessionId)
    }
    const modelStats = [...resultsByModel].map(([groupKey, results]) => ({
        ...summarizeModelResults(modelsById.get(groupKey)!, results),
        groupKey
    }))
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
