import type {
    BenchmarkResult,
    ExperimentRun,
    ExperimentVariant,
    LLMModel,
    ModelSnapshot,
    ResolvedGenerationConfig,
    TestCase
} from '@/lib/types'
import { modelIdentity } from '@/lib/providers/catalog'
import {
    resultStatus,
    summarizeModelResults,
    type ModelStat
} from '@/features/stats/domain/statistics'

const positive = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
const nonnegative = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
const average = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0

// Mirrors the arena error-count semantics so attempt counters stay comparable.
const isFailedAttempt = (result: BenchmarkResult) =>
    resultStatus(result) === 'error' ||
    (result.error && resultStatus(result) !== 'cancelled')

/** Adapt frozen identities for statistics only; never enable network dispatch. */
export function modelFromSnapshot(snapshot: ModelSnapshot): LLMModel {
    return {
        id: snapshot.id,
        name: snapshot.name,
        provider: snapshot.provider,
        ...(snapshot.providerName !== undefined && {
            providerName: snapshot.providerName
        }),
        ...(snapshot.providerId !== undefined && {
            providerId: snapshot.providerId
        }),
        enabled: false,
        mode: snapshot.mode,
        decisionProtocol: snapshot.decisionProtocol,
        ...(snapshot.pricing !== undefined && {
            pricing: { ...snapshot.pricing }
        }),
        ...(snapshot.endpoint !== undefined && { baseURL: snapshot.endpoint }),
        ...(snapshot.capabilities !== undefined && {
            capabilities: { ...snapshot.capabilities }
        })
    }
}

/** Include the endpoint fingerprint so URLs sharing a public path stay distinct. */
export function snapshotIdentityKey(snapshot: ModelSnapshot): string {
    return `${modelIdentity(modelFromSnapshot(snapshot))}|${snapshot.endpointFingerprint}`
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

export interface ExperimentModelStat extends ModelStat {
    variantId: string
    variantName: string
}

export interface ExperimentStatistics {
    modelStats: ExperimentModelStat[]
    totalSessions: number
    totalMessages: number
    completedCount: number
    errorCount: number
    cancelledCount: number
    successRate: number
    totalTokensAcrossModels: number
    avgGlobalTPS: number
    totalCost: number
    costSampleCount: number
    estimatedCount: number
    topTPSModel?: ExperimentModelStat
    topRatingModel?: ExperimentModelStat
    fastestModel?: ExperimentModelStat
    plannedTaskCount: number
    selectedTaskCount: number
    executedTaskCount: number
    recordedAttemptCount: number
    failedAttemptCount: number
    retriedTaskCount: number
    knownAllAttemptCost?: number
    knownAllAttemptCostSampleCount: number
    knownJudgeCost?: number
    knownJudgeCostSampleCount: number
    trialStats: TrialStat[]
}

function trialMetric(values: number[]): TrialMetric {
    if (!values.length) return { sampleCount: 0 }
    if (values.length === 1) return { sampleCount: 1, mean: values[0] }
    const mean = average(values)
    // Sample (n-1) standard deviation; undefined below two samples.
    const variance =
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (values.length - 1)
    return {
        sampleCount: values.length,
        mean,
        sampleStdDev: Math.sqrt(Math.max(variance, 0))
    }
}

/** Summarize latest attempts; include all attempts in costs/failures.
 * Deduplicate judge costs by call ID and keep unknown costs absent. */
export function aggregateExperimentStatistics(
    run: ExperimentRun,
    variantId?: string
): ExperimentStatistics {
    const variantById = new Map(run.variants.map((v) => [v.id, v]))
    const snapshotById = new Map(run.models.map((m) => [m.id, m]))
    const variantOrder = new Map(run.variants.map((v, index) => [v.id, index]))
    const modelOrder = new Map(run.models.map((m, index) => [m.id, index]))
    const selectedTasks = variantId
        ? run.tasks.filter((task) => task.variantId === variantId)
        : run.tasks

    interface Group {
        snapshot: ModelSnapshot
        variant: ExperimentVariant
        results: BenchmarkResult[]
    }
    const grouped = new Map<string, Group>()
    for (const task of selectedTasks) {
        const latest = task.attempts[task.attempts.length - 1]
        const snapshot = snapshotById.get(task.modelId)
        const variant = variantById.get(task.variantId)
        if (!latest || !snapshot || !variant) continue
        const key = JSON.stringify([task.modelId, task.variantId])
        const group = grouped.get(key)
        if (group) group.results.push(latest)
        else grouped.set(key, { snapshot, variant, results: [latest] })
    }
    const modelStats = [...grouped.values()]
        .sort(
            (a, b) =>
                (variantOrder.get(a.variant.id) ?? 0) -
                    (variantOrder.get(b.variant.id) ?? 0) ||
                (modelOrder.get(a.snapshot.id) ?? 0) -
                    (modelOrder.get(b.snapshot.id) ?? 0)
        )
        .map(({ snapshot, variant, results }): ExperimentModelStat => ({
            ...summarizeModelResults(modelFromSnapshot(snapshot), results),
            variantId: variant.id,
            variantName: variant.name
        }))

    let executedTaskCount = 0
    let retriedTaskCount = 0
    let recordedAttemptCount = 0
    let failedAttemptCount = 0
    let knownAllAttemptCost = 0
    let knownAllAttemptCostSampleCount = 0
    const judgeCostsByCall = new Map<string, number>()
    for (const task of selectedTasks) {
        if (task.attempts.length > 0) executedTaskCount += 1
        if (task.attempts.length > 1) retriedTaskCount += 1
        recordedAttemptCount += task.attempts.length
        for (const attempt of task.attempts) {
            if (isFailedAttempt(attempt)) failedAttemptCount += 1
            const cost = attempt.metrics?.cost
            if (nonnegative(cost)) {
                knownAllAttemptCost += cost
                knownAllAttemptCostSampleCount += 1
            }
            const judged = attempt.judgeEvaluation
            const judgedCost = judged?.usage?.cost
            if (judged && nonnegative(judgedCost))
                judgeCostsByCall.set(judged.judgeCallId, judgedCost)
        }
    }
    const knownJudgeCost = [...judgeCostsByCall.values()].reduce(
        (sum, cost) => sum + cost,
        0
    )

    interface TrialEntry {
        stat: Pick<TrialStat, 'caseId' | 'modelId' | 'variantId'>
        ttft: number[]
        tps: number[]
        totalDuration: number[]
    }
    const trialSamples = new Map<string, TrialEntry>()
    for (const task of selectedTasks) {
        const key = JSON.stringify([task.caseId, task.modelId, task.variantId])
        let entry = trialSamples.get(key)
        if (!entry) {
            entry = {
                stat: {
                    caseId: task.caseId,
                    modelId: task.modelId,
                    variantId: task.variantId
                },
                ttft: [],
                tps: [],
                totalDuration: []
            }
            trialSamples.set(key, entry)
        }
        const latest = task.attempts[task.attempts.length - 1]
        if (!latest || resultStatus(latest) !== 'completed' || latest.error)
            continue
        const metrics = latest.metrics
        const mode = snapshotById.get(task.modelId)?.mode ?? 'chat'
        if (mode !== 'decision' && positive(metrics?.ttft))
            entry.ttft.push(metrics.ttft)
        if (positive(metrics?.totalDuration))
            entry.totalDuration.push(metrics.totalDuration)
        // Trial TPS stability uses API-reported samples only; estimated or
        // unknown sources and image generations never enter the spread.
        if (
            mode === 'chat' &&
            metrics?.tokenSource === 'api' &&
            positive(metrics.tps)
        )
            entry.tps.push(metrics.tps)
    }
    const trialStats: TrialStat[] = [...trialSamples.values()].map((entry) => ({
        ...entry.stat,
        ttft: trialMetric(entry.ttft),
        tps: trialMetric(entry.tps),
        totalDuration: trialMetric(entry.totalDuration)
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
    const topTPSModel: ExperimentModelStat | undefined = modelStats
        .filter((stat) => stat.speedSampleCount > 0)
        .sort((a, b) => b.avgTPS - a.avgTPS)[0]
    const topRatingModel: ExperimentModelStat | undefined = modelStats
        .filter((stat) => stat.ratingCount > 0)
        .sort((a, b) => b.avgRating - a.avgRating)[0]
    const fastestModel: ExperimentModelStat | undefined = modelStats
        .filter((stat) => stat.latencySampleCount > 0)
        .sort((a, b) => a.avgTTFT - b.avgTTFT)[0]
    return {
        modelStats,
        // Experiments are not chat sessions; session counters stay zero.
        totalSessions: 0,
        totalMessages,
        completedCount,
        errorCount,
        cancelledCount,
        successRate: finished ? (completedCount / finished) * 100 : 0,
        totalTokensAcrossModels: modelStats.reduce(
            (sum, stat) => sum + stat.totalTokens,
            0
        ),
        avgGlobalTPS: speedSamples
            ? modelStats.reduce(
                  (sum, stat) => sum + stat.avgTPS * stat.speedSampleCount,
                  0
              ) / speedSamples
            : 0,
        totalCost: modelStats.reduce((sum, stat) => sum + stat.totalCost, 0),
        costSampleCount: modelStats.reduce(
            (sum, stat) => sum + stat.costSampleCount,
            0
        ),
        estimatedCount: modelStats.reduce(
            (sum, stat) => sum + stat.estimatedCount,
            0
        ),
        topTPSModel,
        topRatingModel,
        fastestModel,
        plannedTaskCount: run.tasks.length,
        selectedTaskCount: selectedTasks.length,
        executedTaskCount,
        recordedAttemptCount,
        failedAttemptCount,
        retriedTaskCount,
        ...(knownAllAttemptCostSampleCount > 0 && {
            knownAllAttemptCost
        }),
        knownAllAttemptCostSampleCount,
        ...(judgeCostsByCall.size > 0 && { knownJudgeCost }),
        knownJudgeCostSampleCount: judgeCostsByCall.size,
        trialStats
    }
}

export const COMPARISON_METRICS = [
    'avgTTFT',
    'p95TTFT',
    'avgDuration',
    'avgTPS',
    'totalCost',
    'rulePassRate',
    'aiAccuracyMean',
    'aiInstructionFollowingMean',
    'aiCompletenessMean'
] as const
export type ComparisonMetric = (typeof COMPARISON_METRICS)[number]

export interface ComparisonDelta {
    baseline?: number
    target?: number
    absolute?: number
    relative?: number
}

export interface ComparisonModelEntry {
    identity: string
    baseline?: ExperimentModelStat
    target?: ExperimentModelStat
    metrics?: Partial<Record<ComparisonMetric, ComparisonDelta>>
}

export interface ExperimentComparison {
    compatible: boolean
    reason?:
        | 'ambiguous-model-identity'
        | 'no-matching-models'
        | 'different-test-set'
        | 'missing-variant'
    differences: { field: string; baseline: unknown; target: unknown }[]
    models: ComparisonModelEntry[]
}

const metricValue: Record<
    ComparisonMetric,
    (stat: ExperimentModelStat) => number
> = {
    avgTTFT: (stat) => stat.avgTTFT,
    p95TTFT: (stat) => stat.p95TTFT,
    avgDuration: (stat) => stat.avgDuration,
    avgTPS: (stat) => stat.avgTPS,
    totalCost: (stat) => stat.totalCost,
    rulePassRate: (stat) => stat.rulePassRate,
    aiAccuracyMean: (stat) => stat.aiAccuracyMean,
    aiInstructionFollowingMean: (stat) => stat.aiInstructionFollowingMean,
    aiCompletenessMean: (stat) => stat.aiCompletenessMean
}

const metricHasSample: Record<
    ComparisonMetric,
    (stat: ExperimentModelStat) => boolean
> = {
    avgTTFT: (stat) => stat.latencySampleCount > 0,
    p95TTFT: (stat) => stat.latencySampleCount > 0,
    avgDuration: (stat) => stat.durationSampleCount > 0,
    avgTPS: (stat) => stat.speedSampleCount > 0,
    totalCost: (stat) => stat.costSampleCount > 0,
    rulePassRate: (stat) => stat.ruleEvaluatedCount > 0,
    aiAccuracyMean: (stat) => stat.aiRatingCount > 0,
    aiInstructionFollowingMean: (stat) => stat.aiRatingCount > 0,
    aiCompletenessMean: (stat) => stat.aiRatingCount > 0
}

function compareMetrics(
    baselineStat: ExperimentModelStat,
    targetStat: ExperimentModelStat
): Partial<Record<ComparisonMetric, ComparisonDelta>> {
    const metrics: Partial<Record<ComparisonMetric, ComparisonDelta>> = {}
    for (const metric of COMPARISON_METRICS) {
        const baselineValid = metricHasSample[metric](baselineStat)
        const targetValid = metricHasSample[metric](targetStat)
        if (!baselineValid && !targetValid) continue
        const delta: ComparisonDelta = {}
        if (baselineValid) delta.baseline = metricValue[metric](baselineStat)
        if (targetValid) delta.target = metricValue[metric](targetStat)
        if (baselineValid && targetValid) {
            const baseline = delta.baseline as number
            delta.absolute = (delta.target as number) - baseline
            if (baseline > 0) delta.relative = delta.absolute / baseline
        }
        metrics[metric] = delta
    }
    return metrics
}

function flattenConfig(
    config: ResolvedGenerationConfig | undefined
): Record<string, unknown> {
    const flat: Record<string, unknown> = {}
    const walk = (value: unknown, path: string) => {
        if (value === undefined) return
        if (Array.isArray(value) || typeof value !== 'object' || !value) {
            flat[path] = value
            return
        }
        for (const [key, child] of Object.entries(value))
            walk(child, path ? `${path}.${key}` : key)
    }
    walk(config?.requested, '')
    return flat
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (Array.isArray(a) && Array.isArray(b))
        return (
            a.length === b.length &&
            a.every((item, index) => deepEqual(item, b[index]))
        )
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        const aKeys = Object.keys(a)
        const bKeys = Object.keys(b)
        return (
            aKeys.length === bKeys.length &&
            aKeys.every((key) =>
                deepEqual(
                    (a as Record<string, unknown>)[key],
                    (b as Record<string, unknown>)[key]
                )
            )
        )
    }
    return false
}

/** Strict ordered case-sequence equality; case IDs are irrelevant. */
function sameCaseSequence(a: TestCase[], b: TestCase[]): boolean {
    return (
        a.length === b.length &&
        a.every((testCase, index) => {
            const other = b[index]
            return (
                testCase.prompt === other.prompt &&
                testCase.expected === other.expected &&
                testCase.evaluation?.type === other.evaluation?.type &&
                testCase.evaluation?.tolerance === other.evaluation?.tolerance
            )
        })
    )
}

/** Match frozen identities across chosen variants. Reject ambiguous models;
 * calculate relative deltas only with a positive baseline and valid samples. */
export function compareExperiments(
    baseline: ExperimentRun,
    target: ExperimentRun,
    selection: { baselineVariantId: string; targetVariantId: string }
): ExperimentComparison {
    const baselineVariant = baseline.variants.find(
        (variant) => variant.id === selection.baselineVariantId
    )
    const targetVariant = target.variants.find(
        (variant) => variant.id === selection.targetVariantId
    )
    if (!baselineVariant || !targetVariant)
        return {
            compatible: false,
            reason: 'missing-variant',
            differences: [],
            models: []
        }
    if (!sameCaseSequence(baseline.testSet.cases, target.testSet.cases))
        return {
            compatible: false,
            reason: 'different-test-set',
            differences: [],
            models: []
        }

    const indexRun = (run: ExperimentRun, stats: ExperimentModelStat[]) => {
        const snapshotById = new Map(
            run.models.map((model) => [model.id, model])
        )
        const byKey = new Map<
            string,
            { stat: ExperimentModelStat; snapshot: ModelSnapshot }
        >()
        let ambiguous = false
        for (const stat of stats) {
            const snapshot = snapshotById.get(stat.id)
            if (!snapshot) continue
            const key = snapshotIdentityKey(snapshot)
            if (byKey.has(key)) ambiguous = true
            else byKey.set(key, { stat, snapshot })
        }
        return { byKey, ambiguous }
    }
    const base = indexRun(
        baseline,
        aggregateExperimentStatistics(baseline, selection.baselineVariantId)
            .modelStats
    )
    const targ = indexRun(
        target,
        aggregateExperimentStatistics(target, selection.targetVariantId)
            .modelStats
    )

    const differences: { field: string; baseline: unknown; target: unknown }[] =
        []
    if (baseline.repetitions !== target.repetitions)
        differences.push({
            field: 'repetitions',
            baseline: baseline.repetitions,
            target: target.repetitions
        })
    if (baseline.maxConcurrent !== target.maxConcurrent)
        differences.push({
            field: 'maxConcurrent',
            baseline: baseline.maxConcurrent,
            target: target.maxConcurrent
        })
    const keys = [
        ...new Set([...base.byKey.keys(), ...targ.byKey.keys()])
    ].sort()
    for (const key of keys) {
        const baseEntry = base.byKey.get(key)
        const targetEntry = targ.byKey.get(key)
        if (!baseEntry || !targetEntry) continue
        const baselineConfig = flattenConfig(
            baseline.configByModelVariant[baseEntry.snapshot.id]?.[
                selection.baselineVariantId
            ]
        )
        const targetConfig = flattenConfig(
            target.configByModelVariant[targetEntry.snapshot.id]?.[
                selection.targetVariantId
            ]
        )
        const paths = [
            ...new Set([
                ...Object.keys(baselineConfig),
                ...Object.keys(targetConfig)
            ])
        ].sort()
        for (const path of paths) {
            if (!deepEqual(baselineConfig[path], targetConfig[path]))
                differences.push({
                    field: `config.${baseEntry.snapshot.id}.${path}`,
                    baseline: baselineConfig[path],
                    target: targetConfig[path]
                })
        }
    }

    const models: ComparisonModelEntry[] = keys.map((key) => {
        const baseEntry = base.byKey.get(key)
        const targetEntry = targ.byKey.get(key)
        return {
            identity: key,
            ...(baseEntry && { baseline: baseEntry.stat }),
            ...(targetEntry && { target: targetEntry.stat })
        }
    })

    if (base.ambiguous || targ.ambiguous)
        return {
            compatible: false,
            reason: 'ambiguous-model-identity',
            differences,
            models
        }
    const commonKeys = keys.filter(
        (key) => base.byKey.has(key) && targ.byKey.has(key)
    )
    if (!commonKeys.length)
        return {
            compatible: false,
            reason: 'no-matching-models',
            differences,
            models
        }

    for (const entry of models) {
        if (!commonKeys.includes(entry.identity)) continue
        entry.metrics = compareMetrics(
            base.byKey.get(entry.identity)!.stat,
            targ.byKey.get(entry.identity)!.stat
        )
    }
    return { compatible: true, differences, models }
}
