/** SDK timeouts in milliseconds: whole call, individual step, and gap between chunks. */
export interface TimeoutConfig {
    totalMs?: number
    stepMs?: number
    chunkMs?: number
}

export interface TelemetryConfig {
    isEnabled: boolean
    functionId?: string
    recordInputs?: boolean
    recordOutputs?: boolean
    metadata?: Record<string, string | number | boolean>
}

export interface GenerationConfig {
    maxConcurrent?: number
    temperature: number
    maxTokens: number
    topP: number
    topK?: number
    frequencyPenalty?: number
    presencePenalty?: number
    repetitionPenalty?: number
    seed?: number
    stopSequences?: string[]
    minP?: number
    systemPrompt?: string
    connectTimeout?: number
    readTimeout?: number
    timeout?: TimeoutConfig
    telemetry?: TelemetryConfig
}

export const SAMPLING_PARAMETERS = [
    'temperature',
    'maxTokens',
    'topP',
    'topK',
    'frequencyPenalty',
    'presencePenalty',
    'repetitionPenalty',
    'seed',
    'stopSequences',
    'minP'
] as const
export type SamplingParameter = (typeof SAMPLING_PARAMETERS)[number]

/** Field-level partial telemetry override; `undefined` fields inherit. */
export interface TelemetryConfigPatch {
    isEnabled?: boolean
    functionId?: string
    recordInputs?: boolean
    recordOutputs?: boolean
    metadata?: Record<string, string | number | boolean>
}

/** Override fields inherit when absent; explicit zero/false/empty values win.
 * Timeout and telemetry merge per field; arrays and metadata replace wholesale.
 * Scheduling concurrency is global-only. */
export interface GenerationConfigPatch {
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
    systemPrompt?: string
    connectTimeout?: number
    readTimeout?: number
    timeout?: TimeoutConfig
    telemetry?: TelemetryConfigPatch
}

export interface ModelCapabilities {
    chatProtocol?: 'openai-compatible' | 'anthropic'
    vision?: boolean
    unsupportedParameters?: SamplingParameter[]
}

/** USD per million tokens; cache prices are optional provider-specific rates. */
export interface ModelPricing {
    input: number
    output: number
    cacheRead?: number
    cacheWrite?: number
}

export type ConfigSource = 'global' | 'model' | 'experiment' | 'variant'

export interface ResolvedGenerationConfig {
    /** Merged configuration exactly as requested by all layers. */
    requested: GenerationConfig
    /** Request payload after scheduling and unsupported parameters are removed. */
    effective: Partial<GenerationConfig>
    /** Field provenance keyed by dot paths such as `timeout.totalMs`. */
    sources: Record<string, ConfigSource>
    /** Sampling parameters dropped because the model declares them unsupported. */
    excludedParameters: string[]
}

export interface LLMModel {
    id: string
    name: string
    provider: LLMProvider
    providerName?: string
    providerId?: string
    apiKey?: string
    baseURL?: string
    enabled: boolean
    mode?: 'chat' | 'image' | 'decision'
    decisionProtocol?: DecisionProtocol
    config?: GenerationConfigPatch
    pricing?: ModelPricing
    capabilities?: ModelCapabilities
}

/** Frozen model identity without credentials; endpoint queries and hashes are stripped. */
export interface ModelSnapshot {
    id: string
    name: string
    provider: LLMProvider
    providerName?: string
    providerId?: string
    mode: 'chat' | 'image' | 'decision'
    decisionProtocol?: DecisionProtocol
    pricing?: ModelPricing
    endpoint?: string
    endpointFingerprint: string
    capabilities?: ModelCapabilities
}

/** Captured once per request before dispatch; never recomputed mid-stream. */
export interface RequestSnapshot {
    schemaVersion: 1
    model: ModelSnapshot
    parameters: ResolvedGenerationConfig
    context: 'conversation' | 'independent'
    capturedAt: number
}

export type DecisionProtocol = 'structured' | 'system-one' | 'openai-responses'

export const PROVIDER_IDS = [
    'openai',
    'anthropic',
    'openrouter',
    'google',
    'deepseek',
    'typesafe',
    'vercel',
    'commandcode',
    'zenmux',
    'xai',
    'groq',
    'mistral',
    'togetherai',
    'fireworks',
    'cerebras',
    'moonshot',
    'moonshot-cn',
    'dashscope',
    'dashscope-intl',
    'siliconflow',
    'siliconflow-intl',
    'zai',
    'zhipu',
    'zai-coding',
    'zhipu-coding',
    'minimax',
    'minimax-cn',
    'nebius',
    'perplexity',
    'opencode',
    'opencode-go',
    'ollama',
    'lmstudio',
    'custom',
    'other'
] as const
export type LLMProvider = (typeof PROVIDER_IDS)[number]

/** Global updates accept everything a patch accepts plus scheduling. */
export type GlobalConfigUpdate = GenerationConfigPatch & {
    maxConcurrent?: number
}

export interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface BenchmarkMetrics {
    ttft: number
    tps: number
    totalDuration: number
    tokenCount: number
    inputTokens?: number
    outputTokens?: number
    cost?: number
    costSource?: 'api' | 'estimated'
    cacheReadTokens?: number
    cacheWriteTokens?: number
    tokenSource?: 'api' | 'estimated'
    reasoningTokens?: number
}

export interface RuleEvaluation {
    type: 'exact' | 'contains' | 'json' | 'decision'
    passed: boolean
    evaluatedAt: number
    reason?: string
}

/** One retained score per answer; usage is shared by judgeCallId. */
export interface JudgeEvaluation {
    judgeCallId: string
    accuracy: number
    instructionFollowing: number
    completeness: number
    rationale: string
    judge: ModelSnapshot
    judgeConfig: Partial<GenerationConfig>
    judgePrompt: string
    judgedAt: number
    usage?: { inputTokens?: number; outputTokens?: number; cost?: number }
}

export interface BenchmarkResult {
    id: string
    modelId: string
    prompt: string
    response: string
    reasoning?: string
    metrics: BenchmarkMetrics
    timestamp: number
    error?: string
    rating?: number // 1-5 score
    ratingSource?: 'human' | 'ai'
    ratedAt?: number
    ruleEvaluation?: RuleEvaluation
    judgeEvaluation?: JudgeEvaluation
    status?: 'pending' | 'completed' | 'error' | 'cancelled'
    requestSnapshot?: RequestSnapshot
    /** Set for attempts recorded inside an experiment run. */
    experiment?: { runId: string; taskId: string; attempt: number }
}

export interface ChatSession {
    id: string
    title: string
    messages: Message[]
    models: string[]
    results: Record<string, BenchmarkResult[]>
    createdAt: number
}

export interface TestCase {
    id: string
    prompt: string
    expected?: string
    evaluation?: {
        type: 'exact' | 'contains' | 'json' | 'decision'
        tolerance?: number
    }
}

export interface TestSet {
    id: string
    name: string
    cases: TestCase[]
    createdAt: number
}

export interface PromptVariable {
    name: string
    description: string
}

export interface PromptTemplate {
    id: string
    title: string
    content: string
    variables: PromptVariable[]
    createdAt: number
    updatedAt: number
}

export interface ExperimentVariant {
    id: string
    name: string
    overrides: GenerationConfigPatch
}

export interface ExperimentTask {
    id: string
    caseId: string
    modelId: string
    variantId: string
    /** Zero-based; tasks without attempts have not been dispatched. */
    repeatIndex: number
    attempts: BenchmarkResult[]
}

export type ExperimentStatus =
    'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'interrupted'

export interface ExperimentRun {
    id: string
    name: string
    testSet: TestSet
    models: ModelSnapshot[]
    variants: ExperimentVariant[]
    configByModelVariant: Record<
        string,
        Record<string, ResolvedGenerationConfig>
    >
    repetitions: number
    maxConcurrent: number
    tasks: ExperimentTask[]
    pendingTaskIds: string[]
    status: ExperimentStatus
    createdAt: number
    startedAt?: number
    finishedAt?: number
    error?: string
}

export interface ExperimentDraft {
    name: string
    testSet: TestSet
    modelIds: string[]
    repetitions: number
    overrides: GenerationConfigPatch
    variants: ExperimentVariant[]
}
