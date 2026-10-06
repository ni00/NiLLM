import type { BenchmarkResult, ChatSession, LLMModel } from '@/lib/types'
import { withEstimatedCost } from '@/lib/usage'
import { providerGroupKey, providerLabel } from '@/lib/providers/catalog'
import { sanitizeModels } from '@/lib/providers/export'

export interface ModelStat {
    id: string
    /** Distinguishes frozen configurations that share the workspace model ID. */
    groupKey?: string
    name: string
    provider: string
    providerKey: string
    mode: 'chat' | 'image' | 'decision'
    avgTPS: number
    avgTTFT: number
    avgRating: number
    avgDuration: number
    medianTTFT: number
    p95TTFT: number
    medianDuration: number
    p95Duration: number
    durationSampleCount: number
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
    apiAvgTPS: number
    apiSpeedSampleCount: number
    estimatedAvgTPS: number
    estimatedSpeedSampleCount: number
    unknownSpeedSampleCount: number
    humanAvgRating: number
    humanRatingCount: number
    rulePassedCount: number
    ruleEvaluatedCount: number
    rulePassRate: number
    aiAccuracyMean: number
    aiInstructionFollowingMean: number
    aiCompletenessMean: number
    aiRatingCount: number
}
export interface StatsFilter {
    since?: number
    providerKey?: string
    mode?: 'chat' | 'image' | 'decision'
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

export function summarizeModelResults(
    model: LLMModel,
    results: BenchmarkResult[]
): ModelStat {
    const successful = results.filter(
        (r) => resultStatus(r) === 'completed' && !r.error
    )
    const speedResults =
        model.mode === 'image' || model.mode === 'decision'
            ? []
            : successful.filter((r) => positive(r.metrics?.tps))
    const speeds = speedResults.map((r) => r.metrics.tps)
    const apiSpeeds = speedResults
        .filter((r) => r.metrics.tokenSource === 'api')
        .map((r) => r.metrics.tps)
    const estimatedSpeeds = speedResults
        .filter((r) => r.metrics.tokenSource === 'estimated')
        .map((r) => r.metrics.tps)
    const unknownSpeeds = speedResults
        .filter(
            (r) =>
                r.metrics.tokenSource !== 'api' &&
                r.metrics.tokenSource !== 'estimated'
        )
        .map((r) => r.metrics.tps)
    const latencies =
        model.mode === 'decision'
            ? []
            : successful.map((r) => r.metrics?.ttft).filter(positive)
    const durations = successful
        .map((r) => r.metrics?.totalDuration)
        .filter(positive)
    const ratings = successful
        .map((r) => r.rating)
        .filter(positive)
        .filter((v) => v <= 5)
    const humanRatings = successful
        .map((r) => (r.ratingSource === 'human' ? r.rating : undefined))
        .filter(positive)
        .filter((v) => v <= 5)
    const validScore = (value: number) =>
        Number.isFinite(value) && value >= 1 && value <= 5
    const judged = successful.filter((r) => {
        const evaluation = r.judgeEvaluation
        return (
            !!evaluation &&
            validScore(evaluation.accuracy) &&
            validScore(evaluation.instructionFollowing) &&
            validScore(evaluation.completeness)
        )
    })
    const ruled = successful.filter((r) => r.ruleEvaluation)
    const rulePassed = ruled.filter((r) => r.ruleEvaluation!.passed).length
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
        medianDuration: percentile(durations, 0.5),
        p95Duration: percentile(durations, 0.95),
        durationSampleCount: durations.length,
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
            model.mode === 'image' || model.mode === 'decision'
                ? 0
                : successful.filter(
                      (r) =>
                          r.metrics?.tokenSource === 'estimated' ||
                          r.metrics?.outputTokens === undefined
                  ).length,
        speedSampleCount: speeds.length,
        latencySampleCount: latencies.length,
        ratingCount: ratings.length,
        apiAvgTPS: average(apiSpeeds),
        apiSpeedSampleCount: apiSpeeds.length,
        estimatedAvgTPS: average(estimatedSpeeds),
        estimatedSpeedSampleCount: estimatedSpeeds.length,
        unknownSpeedSampleCount: unknownSpeeds.length,
        humanAvgRating: average(humanRatings),
        humanRatingCount: humanRatings.length,
        rulePassedCount: rulePassed,
        ruleEvaluatedCount: ruled.length,
        rulePassRate: ruled.length ? (rulePassed / ruled.length) * 100 : 0,
        aiAccuracyMean: average(judged.map((r) => r.judgeEvaluation!.accuracy)),
        aiInstructionFollowingMean: average(
            judged.map((r) => r.judgeEvaluation!.instructionFollowing)
        ),
        aiCompletenessMean: average(
            judged.map((r) => r.judgeEvaluation!.completeness)
        ),
        aiRatingCount: judged.length
    }
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
