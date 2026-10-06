import { version as appVersion } from '../../../../package.json'
import type { BenchmarkResult } from '@/lib/types'
import type { ExperimentComparison } from '../../experiments/domain/statistics'
import { compareExperiments } from '../../experiments/domain/statistics'
import { resultStatus } from '@/lib/statistics'
import type { ModelStat } from '@/lib/statistics'
import type {
    ReportDocument,
    ReportExperimentComparison,
    ReportExperimentManifest,
    ReportInput,
    ReportOptions,
    ReportRecord,
    ReportSummary
} from './report-types'
import {
    publicMetrics,
    publicModelSnapshot,
    publicModelStat,
    publicQuality,
    publicRequestSnapshot,
    sanitizeConfigObject,
    sanitizeEndpointJson,
    sanitizeReportIdentity,
    sanitizeResolvedConfig,
    sanitizeUnknown
} from './report-sanitize'
import { aggregateStatistics, selectStatisticsResults } from './statistics'
import { aggregateExperimentStatistics } from '../../experiments/domain/statistics'

interface AggregateSummaryFields {
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
    topTPSModel?: ModelStat
    topRatingModel?: ModelStat
    fastestModel?: ModelStat
}

function baseRecord(
    source: 'arena' | 'experiment',
    result: BenchmarkResult,
    options: ReportOptions
) {
    const content = options.includeContent
    const includeReasoning = content && options.includeReasoning
    return {
        source,
        modelId: result.modelId,
        resultId: result.id,
        timestamp: result.timestamp,
        status: resultStatus(result),
        ...publicMetrics(result),
        ...publicQuality(result, content),
        ...(result.requestSnapshot !== undefined && {
            requestSnapshot: publicRequestSnapshot(
                result.requestSnapshot,
                content
            )
        }),
        ...(content && { prompt: result.prompt }),
        ...(content && { response: result.response }),
        ...(includeReasoning &&
            result.reasoning !== undefined && {
                reasoning: result.reasoning
            })
    }
}

const ALWAYS_OMITTED = [
    'apiKey',
    'telemetry.metadata',
    'endpoint.query',
    'endpoint.hash'
] as const

function buildOmittedFields(options: ReportOptions): string[] {
    const omitted: string[] = [...ALWAYS_OMITTED]
    if (!options.includeContent)
        omitted.push(
            'prompt',
            'expected',
            'response',
            'systemPrompt',
            'judgePrompt',
            'rationale'
        )
    if (!(options.includeContent && options.includeReasoning))
        omitted.push('reasoning')
    return omitted
}

const REPORT_UNITS: Record<string, string> = {
    ttft: 'milliseconds',
    duration: 'milliseconds',
    tps: 'tokens/second',
    cost: 'USD',
    tokens: 'tokens',
    rating: '1-5',
    rulePassRate: 'percent'
}

function summaryFromAggregates(stats: AggregateSummaryFields): ReportSummary {
    return {
        totalSessions: stats.totalSessions,
        totalMessages: stats.totalMessages,
        completedCount: stats.completedCount,
        errorCount: stats.errorCount,
        cancelledCount: stats.cancelledCount,
        successRate: stats.successRate,
        totalTokensAcrossModels: stats.totalTokensAcrossModels,
        avgGlobalTPS: stats.avgGlobalTPS,
        totalCost: stats.totalCost,
        costSampleCount: stats.costSampleCount,
        estimatedCount: stats.estimatedCount,
        ...(stats.topTPSModel && {
            topTPSModel: publicModelStat(stats.topTPSModel)
        }),
        ...(stats.topRatingModel && {
            topRatingModel: publicModelStat(stats.topRatingModel)
        }),
        ...(stats.fastestModel && {
            fastestModel: publicModelStat(stats.fastestModel)
        })
    }
}

/** Omit credentials and telemetry metadata; system prompts follow content scope. */
function redactedDifferenceValue(
    field: string,
    value: unknown,
    content: boolean
): unknown {
    if (field.includes('telemetry.metadata') || field.includes('apiKey'))
        return null
    if (field.includes('systemPrompt') && !content) return null
    return sanitizeUnknown(value, content)
}

function publicComparison(
    comparison: ExperimentComparison,
    content: boolean
): ReportExperimentComparison {
    return {
        compatible: comparison.compatible,
        ...(comparison.reason !== undefined && { reason: comparison.reason }),
        differences: comparison.differences.map((difference) => ({
            field: difference.field,
            baseline: redactedDifferenceValue(
                difference.field,
                difference.baseline,
                content
            ),
            target: redactedDifferenceValue(
                difference.field,
                difference.target,
                content
            )
        })),
        models: comparison.models.map((model) => ({
            identity: sanitizeReportIdentity(model.identity),
            ...(model.baseline && {
                baseline: publicModelStat(model.baseline)
            }),
            ...(model.target && { target: publicModelStat(model.target) }),
            ...(model.metrics !== undefined && { metrics: model.metrics })
        }))
    }
}

function buildArenaDocument(
    input: Extract<ReportInput, { source: 'arena' }>,
    options: ReportOptions,
    generatedAt: number
): ReportDocument {
    const stats = aggregateStatistics(
        input.models,
        input.sessions,
        input.filter
    )
    const selection = selectStatisticsResults(
        input.models,
        input.sessions,
        input.filter
    )
    const records: ReportRecord[] = selection.map(({ sessionId, result }) => ({
        ...baseRecord('arena', result, options),
        sessionId,

        selectedForSummary: true
    }))
    const filters: Record<string, string | number | boolean> = {}
    if (input.filter.since !== undefined) filters.since = input.filter.since
    if (input.filter.providerKey)
        filters.providerKey = sanitizeEndpointJson(input.filter.providerKey)
    if (input.filter.mode) filters.mode = input.filter.mode
    return {
        metadata: {
            schemaVersion: 3,
            title: 'NiLLM Arena Performance Report',
            generatedAt: new Date(generatedAt).toISOString(),
            appVersion,
            source: 'arena',
            filters,
            units: REPORT_UNITS,
            omittedFields: buildOmittedFields(options)
        },
        summary: summaryFromAggregates(stats),
        modelComparison: stats.modelStats.map(publicModelStat),
        records
    }
}

function buildExperimentDocument(
    input: Extract<ReportInput, { source: 'experiment' }>,
    options: ReportOptions,
    generatedAt: number
): ReportDocument {
    const { run, variantId } = input
    const content = options.includeContent
    const stats = aggregateExperimentStatistics(run, variantId)
    const caseById = new Map(
        run.testSet.cases.map((kase) => [kase.id, kase] as const)
    )
    const records: ReportRecord[] = []
    for (const task of run.tasks) {
        if (variantId !== undefined && task.variantId !== variantId) continue
        const lastAttempt = task.attempts.length - 1
        task.attempts.forEach((result, attemptIndex) => {
            const kase = caseById.get(task.caseId)
            records.push({
                ...baseRecord('experiment', result, options),
                runId: run.id,
                taskId: task.id,
                caseId: task.caseId,
                variantId: task.variantId,
                repeatIndex: task.repeatIndex,
                attempt: attemptIndex + 1,

                selectedForSummary: attemptIndex === lastAttempt,
                ...(content &&
                    kase !== undefined && {
                        prompt: kase.prompt,
                        ...(kase.expected !== undefined && {
                            expected: kase.expected
                        })
                    })
            })
        })
    }
    const manifest: ReportExperimentManifest = {
        id: run.id,
        name: run.name,
        status: run.status,
        createdAt: run.createdAt,
        ...(run.startedAt !== undefined && { startedAt: run.startedAt }),
        ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt }),
        repetitions: run.repetitions,
        maxConcurrent: run.maxConcurrent,
        models: run.models.map(publicModelSnapshot),
        variants: run.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            overrides: sanitizeConfigObject(variant.overrides, content) ?? {}
        })),
        cases: run.testSet.cases.map((kase) => ({
            id: kase.id,
            ...(kase.evaluation !== undefined && {
                evaluation: { ...kase.evaluation }
            }),
            ...(content && { prompt: kase.prompt }),
            ...(content &&
                kase.expected !== undefined && { expected: kase.expected })
        })),
        configByModelVariant: Object.fromEntries(
            Object.entries(run.configByModelVariant).map(
                ([modelId, byVariant]) =>
                    [
                        modelId,
                        Object.fromEntries(
                            Object.entries(byVariant).map(
                                ([variant, config]) =>
                                    [
                                        variant,
                                        sanitizeResolvedConfig(config, content)
                                    ] as const
                            )
                        )
                    ] as const
            )
        ),
        ...(variantId !== undefined && { selectedVariantId: variantId })
    }
    const filters: Record<string, string | number | boolean> = {
        runId: run.id
    }
    if (variantId !== undefined) filters.variantId = variantId
    if (input.baseline) {
        filters.baselineRunId = input.baseline.run.id
        filters.baselineVariantId = input.baseline.variantId
    }
    return {
        metadata: {
            schemaVersion: 3,
            title: `NiLLM Experiment Report — ${run.name}`,
            generatedAt: new Date(generatedAt).toISOString(),
            appVersion,
            source: 'experiment',
            filters,
            units: REPORT_UNITS,
            omittedFields: buildOmittedFields(options)
        },
        summary: {
            ...summaryFromAggregates(stats),
            plannedTaskCount: stats.plannedTaskCount,
            selectedTaskCount: stats.selectedTaskCount,
            executedTaskCount: stats.executedTaskCount,
            recordedAttemptCount: stats.recordedAttemptCount,
            failedAttemptCount: stats.failedAttemptCount,
            retriedTaskCount: stats.retriedTaskCount,
            ...(stats.knownAllAttemptCost !== undefined && {
                knownAllAttemptCost: stats.knownAllAttemptCost
            }),
            knownAllAttemptCostSampleCount:
                stats.knownAllAttemptCostSampleCount,
            ...(stats.knownJudgeCost !== undefined && {
                knownJudgeCost: stats.knownJudgeCost
            }),
            knownJudgeCostSampleCount: stats.knownJudgeCostSampleCount
        },
        modelComparison: stats.modelStats.map(publicModelStat),
        records,
        experiment: manifest,
        ...(input.baseline && {
            baselineComparison: publicComparison(
                compareExperiments(input.baseline.run, run, {
                    baselineVariantId: input.baseline.variantId,
                    targetVariantId: variantId ?? ''
                }),
                content
            )
        }),
        trialStats: stats.trialStats.map((trial) => ({
            ...trial,
            ttft: { ...trial.ttft },
            tps: { ...trial.tps },
            totalDuration: { ...trial.totalDuration }
        }))
    }
}

/** Build schemaVersion 3 from the supplied snapshot and timestamp; never
 * backfill historical records with current settings. */
export function buildReportDocument(
    input: ReportInput,
    options: ReportOptions,
    generatedAt: number
): ReportDocument {
    return input.source === 'arena'
        ? buildArenaDocument(input, options, generatedAt)
        : buildExperimentDocument(input, options, generatedAt)
}
