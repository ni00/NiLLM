import { version as appVersion } from '../../../../package.json'
import type {
    BenchmarkResult,
    ChatSession,
    ConfigSource,
    ExperimentRun,
    GenerationConfig,
    GenerationConfigPatch,
    JudgeEvaluation,
    LLMModel,
    ModelSnapshot,
    RequestSnapshot,
    ResolvedGenerationConfig,
    RuleEvaluation,
    TelemetryConfig,
    TelemetryConfigPatch,
    TimeoutConfig
} from '@/lib/types'
import { SAMPLING_PARAMETERS } from '@/lib/types'
import { publicEndpoint } from '@/features/benchmark/snapshots'
import {
    aggregateStatistics,
    resultStatus,
    selectStatisticsResults,
    type ModelStat,
    type StatsFilter
} from './statistics'
import {
    aggregateExperimentStatistics,
    compareExperiments,
    type ExperimentComparison,
    type TrialStat
} from '../../experiments/domain/statistics'

/** Apply content exclusions throughout records, manifests, snapshots and
 * comparisons; reasoning requires includeContent. Scores remain available. */
export interface ReportOptions {
    includeContent: boolean
    includeReasoning: boolean
}

export type ReportInput =
    | {
          source: 'arena'
          models: LLMModel[]
          sessions: ChatSession[]
          filter: StatsFilter
      }
    | {
          source: 'experiment'
          run: ExperimentRun
          variantId?: string
          baseline?: { run: ExperimentRun; variantId: string }
      }

/** Whitelisted telemetry: the `metadata` map is never exported. */
export interface ReportTelemetryConfig {
    isEnabled?: boolean
    functionId?: string
    recordInputs?: boolean
    recordOutputs?: boolean
}

export interface ReportTimeoutConfig {
    totalMs?: number
    stepMs?: number
    chunkMs?: number
}

export interface ReportGenerationConfig {
    temperature?: number
    maxTokens?: number
    topP?: number
    topK?: number
    frequencyPenalty?: number
    presencePenalty?: number
    repetitionPenalty?: number
    seed?: number
    stopSequences?: string[]
    minP?: number
    maxConcurrent?: number
    systemPrompt?: string
    connectTimeout?: number
    readTimeout?: number
    timeout?: ReportTimeoutConfig
    telemetry?: ReportTelemetryConfig
}

export interface ReportResolvedGenerationConfig {
    requested: ReportGenerationConfig
    effective: Partial<ReportGenerationConfig>
    sources: Record<string, ConfigSource>
    excludedParameters: string[]
}

/** Model snapshot copy; endpoints re-stripped, no credentials can appear. */
export interface ReportModelSnapshot {
    id: string
    name: string
    provider: ModelSnapshot['provider']
    providerName?: string
    providerId?: string
    mode: 'chat' | 'image' | 'decision'
    decisionProtocol?: ModelSnapshot['decisionProtocol']
    pricing?: ModelSnapshot['pricing']
    endpoint?: string
    endpointFingerprint: string
    capabilities?: {
        vision?: boolean
        unsupportedParameters?: string[]
    }
}

export interface ReportRequestSnapshot {
    schemaVersion: 1
    model: ReportModelSnapshot
    parameters: ReportResolvedGenerationConfig
    context: 'conversation' | 'independent'
    capturedAt: number
}

export interface ReportJudgeEvaluation {
    judgeCallId: string
    accuracy: number
    instructionFollowing: number
    completeness: number
    judgedAt: number
    usage?: {
        inputTokens?: number
        outputTokens?: number
        cost?: number
    }
    judge?: ReportModelSnapshot
    judgeConfig?: ReportGenerationConfig
    judgePrompt?: string
    rationale?: string
}

/** ModelStat without `providerKey` (it embeds the raw endpoint). */
export type ReportModelStat = Omit<ModelStat, 'providerKey'> & {
    variantId?: string
    variantName?: string
}

export interface ReportExperimentComparison {
    compatible: boolean
    reason?: ExperimentComparison['reason']
    differences: {
        field: string
        baseline: unknown
        target: unknown
    }[]
    models: {
        identity: string
        baseline?: ReportModelStat
        target?: ReportModelStat
        metrics?: ExperimentComparison['models'][number]['metrics']
    }[]
}

export interface ReportExperimentManifest {
    id: string
    name: string
    status: ExperimentRun['status']
    createdAt: number
    startedAt?: number
    finishedAt?: number
    repetitions: number
    maxConcurrent: number
    models: ReportModelSnapshot[]
    variants: {
        id: string
        name: string
        overrides: ReportGenerationConfig
    }[]
    cases: {
        id: string
        evaluation?: {
            type: 'exact' | 'contains' | 'json' | 'decision'
            tolerance?: number
        }
        prompt?: string
        expected?: string
    }[]
    configByModelVariant: Record<
        string,
        Record<string, ReportResolvedGenerationConfig>
    >
    selectedVariantId?: string
}

export interface ReportSummary {
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
    topTPSModel?: ReportModelStat
    topRatingModel?: ReportModelStat
    fastestModel?: ReportModelStat
    plannedTaskCount?: number
    selectedTaskCount?: number
    executedTaskCount?: number
    recordedAttemptCount?: number
    failedAttemptCount?: number
    retriedTaskCount?: number
    knownAllAttemptCost?: number
    knownAllAttemptCostSampleCount?: number
    knownJudgeCost?: number
    knownJudgeCostSampleCount?: number
}

export interface ReportRecord {
    source: 'arena' | 'experiment'
    sessionId?: string
    runId?: string
    taskId?: string
    caseId?: string
    modelId: string
    variantId?: string
    repeatIndex?: number
    attempt?: number
    resultId: string
    timestamp: number
    status: 'pending' | 'completed' | 'error' | 'cancelled'
    selectedForSummary: boolean
    ttft?: number
    tps?: number
    totalDuration?: number
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    tokenSource?: 'api' | 'estimated'
    cost?: number
    costSource?: BenchmarkResult['metrics']['costSource']
    cacheReadTokens?: number
    cacheWriteTokens?: number
    rating?: number
    ratingSource?: 'human' | 'ai'
    ruleEvaluation?: RuleEvaluation
    judgeEvaluation?: ReportJudgeEvaluation
    requestSnapshot?: ReportRequestSnapshot
    prompt?: string
    expected?: string
    response?: string
    reasoning?: string
}

export interface ReportDocument {
    metadata: {
        schemaVersion: 3
        title: string
        generatedAt: string
        appVersion: string
        source: 'arena' | 'experiment'
        filters: Record<string, string | number | boolean>
        units: Record<string, string>
        omittedFields: string[]
    }
    summary: ReportSummary
    modelComparison: ReportModelStat[]
    records: ReportRecord[]
    experiment?: ReportExperimentManifest
    baselineComparison?: ReportExperimentComparison
    trialStats?: TrialStat[]
}

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

const finite = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)
const nonNegative = (value: unknown): value is number =>
    finite(value) && value >= 0

/** Normalize and redact endpoint credentials/query/hash; invalid URLs become empty. */
function redactEndpoint(value: string): string {
    try {
        const url = new URL(value)
        url.username = ''
        url.password = ''
        return publicEndpoint(url.href)
    } catch {
        return ''
    }
}

/** Redact endpoint data embedded in JSON provider/model identities. */
export function sanitizeEndpointJson(value: string): string {
    let parsed: unknown
    try {
        parsed = JSON.parse(value)
    } catch {
        return value
    }
    if (!Array.isArray(parsed)) return value
    return JSON.stringify(
        parsed.map((element) => {
            if (typeof element !== 'string') return element
            try {
                const nested = JSON.parse(element)
                if (Array.isArray(nested)) return sanitizeEndpointJson(element)
            } catch {
                // Plain string: the endpoint slot of a direct group key.
            }
            return /^https?:\/\//i.test(element)
                ? redactEndpoint(element)
                : element
        })
    )
}

/** Redact the identity JSON while preserving its endpoint fingerprint suffix. */
export function sanitizeReportIdentity(identity: string): string {
    const splitAt = identity.lastIndexOf('|')
    if (splitAt !== -1 && /^[0-9a-f]{64}$/.test(identity.slice(splitAt + 1))) {
        return (
            sanitizeEndpointJson(identity.slice(0, splitAt)) +
            identity.slice(splitAt)
        )
    }
    return sanitizeEndpointJson(identity)
}

function sanitizeTelemetry(
    telemetry: TelemetryConfig | TelemetryConfigPatch | undefined
): ReportTelemetryConfig | undefined {
    if (!telemetry) return undefined
    const out: ReportTelemetryConfig = {}
    if (telemetry.isEnabled !== undefined) out.isEnabled = telemetry.isEnabled
    if (telemetry.functionId !== undefined)
        out.functionId = telemetry.functionId
    if (telemetry.recordInputs !== undefined)
        out.recordInputs = telemetry.recordInputs
    if (telemetry.recordOutputs !== undefined)
        out.recordOutputs = telemetry.recordOutputs
    return Object.keys(out).length ? out : undefined
}

function sanitizeTimeout(
    timeout: TimeoutConfig | undefined
): ReportTimeoutConfig | undefined {
    if (!timeout) return undefined
    const out: ReportTimeoutConfig = {}
    if (timeout.totalMs !== undefined) out.totalMs = timeout.totalMs
    if (timeout.stepMs !== undefined) out.stepMs = timeout.stepMs
    if (timeout.chunkMs !== undefined) out.chunkMs = timeout.chunkMs
    return Object.keys(out).length ? out : undefined
}

/** Whitelist any GenerationConfig / GenerationConfigPatch-shaped object. */
function sanitizeConfigObject(
    value: GenerationConfig | GenerationConfigPatch | undefined,
    content: boolean
): ReportGenerationConfig | undefined {
    if (!value) return undefined
    const out: ReportGenerationConfig = {}
    const stop = value.stopSequences
    if (stop !== undefined) out.stopSequences = [...stop]
    for (const key of SAMPLING_PARAMETERS) {
        if (key === 'stopSequences') continue
        const item = value[key]
        if (item !== undefined) out[key] = item
    }
    if ('maxConcurrent' in value && value.maxConcurrent !== undefined)
        out.maxConcurrent = value.maxConcurrent
    if (value.connectTimeout !== undefined)
        out.connectTimeout = value.connectTimeout
    if (value.readTimeout !== undefined) out.readTimeout = value.readTimeout
    if (content && typeof value.systemPrompt === 'string')
        out.systemPrompt = value.systemPrompt
    const timeout = sanitizeTimeout(value.timeout)
    if (timeout) out.timeout = timeout
    const telemetry = sanitizeTelemetry(value.telemetry)
    if (telemetry) out.telemetry = telemetry
    return out
}

function sanitizeResolvedConfig(
    config: ResolvedGenerationConfig | undefined,
    content: boolean
): ReportResolvedGenerationConfig {
    return {
        requested: sanitizeConfigObject(config?.requested, content) ?? {},
        effective: sanitizeConfigObject(config?.effective, content) ?? {},
        sources: { ...(config?.sources ?? {}) },
        excludedParameters: [...(config?.excludedParameters ?? [])]
    }
}

/** Deep-copy JSON-safe data, dropping secret keys wherever they hide. */
function sanitizeUnknown(value: unknown, content: boolean, depth = 0): unknown {
    if (depth > 12) return null
    if (value === null) return null
    switch (typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
            return value
        case 'object':
            break
        default:
            return null
    }
    if (Array.isArray(value))
        return value.map((item) => sanitizeUnknown(item, content, depth + 1))
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
        if (key === 'apiKey') continue
        if (key === 'telemetry') {
            // Unknown-depth value: only the telemetry whitelist survives.
            const telemetry = sanitizeTelemetry(
                item as TelemetryConfigPatch | undefined
            )
            if (telemetry) out[key] = telemetry
            continue
        }
        if (key === 'systemPrompt') {
            if (content && typeof item === 'string') out[key] = item
            continue
        }
        out[key] = sanitizeUnknown(item, content, depth + 1)
    }
    return out
}

export function publicModelSnapshot(
    snapshot: ModelSnapshot
): ReportModelSnapshot {
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
        mode: snapshot.mode,
        ...(snapshot.decisionProtocol !== undefined && {
            decisionProtocol: snapshot.decisionProtocol
        }),
        ...(snapshot.pricing !== undefined && {
            pricing: {
                input: snapshot.pricing.input,
                output: snapshot.pricing.output,
                ...(snapshot.pricing.cacheRead !== undefined && {
                    cacheRead: snapshot.pricing.cacheRead
                }),
                ...(snapshot.pricing.cacheWrite !== undefined && {
                    cacheWrite: snapshot.pricing.cacheWrite
                })
            }
        }),
        ...(snapshot.endpoint !== undefined && {
            endpoint: redactEndpoint(snapshot.endpoint) || undefined
        }),
        endpointFingerprint: snapshot.endpointFingerprint,
        ...(snapshot.capabilities !== undefined && {
            capabilities: {
                ...(snapshot.capabilities.vision !== undefined && {
                    vision: snapshot.capabilities.vision
                }),
                ...(snapshot.capabilities.unsupportedParameters && {
                    unsupportedParameters: [
                        ...snapshot.capabilities.unsupportedParameters
                    ]
                })
            }
        })
    }
}

function publicRequestSnapshot(
    snapshot: RequestSnapshot,
    content: boolean
): ReportRequestSnapshot {
    return {
        schemaVersion: 1,
        model: publicModelSnapshot(snapshot.model),
        parameters: sanitizeResolvedConfig(snapshot.parameters, content),
        context: snapshot.context,
        capturedAt: snapshot.capturedAt
    }
}

function publicJudgeEvaluation(
    evaluation: JudgeEvaluation | undefined,
    content: boolean
): ReportJudgeEvaluation | undefined {
    if (!evaluation) return undefined
    const usage = evaluation.usage
    return {
        judgeCallId: evaluation.judgeCallId,
        accuracy: evaluation.accuracy,
        instructionFollowing: evaluation.instructionFollowing,
        completeness: evaluation.completeness,
        judgedAt: evaluation.judgedAt,
        ...(usage !== undefined && {
            usage: {
                ...(nonNegative(usage.inputTokens) && {
                    inputTokens: usage.inputTokens
                }),
                ...(nonNegative(usage.outputTokens) && {
                    outputTokens: usage.outputTokens
                }),
                ...(nonNegative(usage.cost) && { cost: usage.cost })
            }
        }),
        ...(evaluation.judge !== undefined && {
            judge: publicModelSnapshot(evaluation.judge)
        }),
        ...(evaluation.judgeConfig !== undefined && {
            judgeConfig:
                sanitizeConfigObject(evaluation.judgeConfig, content) ?? {}
        }),
        ...(content &&
            evaluation.judgePrompt !== undefined && {
                judgePrompt: evaluation.judgePrompt
            }),
        ...(content &&
            evaluation.rationale !== undefined && {
                rationale: evaluation.rationale
            })
    }
}

function publicRuleEvaluation(
    evaluation: RuleEvaluation | undefined
): RuleEvaluation | undefined {
    if (!evaluation) return undefined
    return {
        type: evaluation.type,
        passed: evaluation.passed,
        evaluatedAt: evaluation.evaluatedAt,
        ...(evaluation.reason !== undefined && { reason: evaluation.reason })
    }
}

export function publicModelStat<T extends ModelStat>(
    stat: T
): Omit<T, 'providerKey'> {
    const copy = { ...stat }
    delete (copy as { providerKey?: unknown }).providerKey
    delete (copy as { groupKey?: unknown }).groupKey
    return copy
}

function publicMetrics(result: BenchmarkResult) {
    const metrics = result.metrics
    const tokenSource = metrics.tokenSource
    return {
        ...(finite(metrics.ttft) && { ttft: metrics.ttft }),
        ...(finite(metrics.tps) && { tps: metrics.tps }),
        ...(finite(metrics.totalDuration) && {
            totalDuration: metrics.totalDuration
        }),
        ...(nonNegative(metrics.inputTokens) && {
            inputTokens: metrics.inputTokens
        }),
        ...(nonNegative(metrics.outputTokens) && {
            outputTokens: metrics.outputTokens
        }),
        ...(nonNegative(metrics.reasoningTokens) && {
            reasoningTokens: metrics.reasoningTokens
        }),
        ...((tokenSource === 'api' || tokenSource === 'estimated') && {
            tokenSource
        }),
        ...(nonNegative(metrics.cost) && { cost: metrics.cost }),
        ...((metrics.costSource === 'api' ||
            metrics.costSource === 'estimated') && {
            costSource: metrics.costSource
        }),
        ...(nonNegative(metrics.cacheReadTokens) && {
            cacheReadTokens: metrics.cacheReadTokens
        }),
        ...(nonNegative(metrics.cacheWriteTokens) && {
            cacheWriteTokens: metrics.cacheWriteTokens
        })
    }
}

function publicQuality(result: BenchmarkResult, content: boolean) {
    const ruleEvaluation = publicRuleEvaluation(result.ruleEvaluation)
    const judgeEvaluation = publicJudgeEvaluation(
        result.judgeEvaluation,
        content
    )
    return {
        ...(finite(result.rating) &&
            result.rating >= 1 &&
            result.rating <= 5 && {
                rating: result.rating,
                ...(result.ratingSource !== undefined && {
                    ratingSource: result.ratingSource
                })
            }),
        ...(ruleEvaluation && { ruleEvaluation }),
        ...(judgeEvaluation && { judgeEvaluation })
    }
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
