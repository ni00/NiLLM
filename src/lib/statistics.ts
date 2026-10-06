import type { BenchmarkResult, LLMModel } from '@/lib/types'
import { providerGroupKey, providerLabel } from '@/lib/providers/catalog'

const positive = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
const nonnegative = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0

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

export interface TrialMetric {
    sampleCount: number
    mean?: number
    sampleStdDev?: number
}

export interface TrialStat {
    caseId: string
    modelId: string
    variantId: string
    ttft: TrialMetric
    tps: TrialMetric
    totalDuration: TrialMetric
}

export const average = (values: number[]) =>
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
