import type {
    BenchmarkResult,
    ChatSession,
    ConfigSource,
    ExperimentRun,
    LLMModel,
    ModelSnapshot,
    RuleEvaluation
} from '@/lib/types'
import type { ModelStat, TrialStat } from '@/lib/statistics'
import type { StatsFilter } from './statistics'
import type { ExperimentComparison } from '../../experiments/domain/statistics'

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
