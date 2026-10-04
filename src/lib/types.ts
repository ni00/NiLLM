/**
 * AI SDK timeout configuration
 * - totalMs: Total timeout for the entire call (all steps combined)
 * - stepMs: Timeout for each individual LLM call step (useful for multi-step tool calls)
 * - chunkMs: Timeout between stream chunks - aborts if no chunk received within this duration
 */
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
/**
 * Sampling-related generation parameters that models may declare unsupported.
 * Shared contract for capability editors, execution filtering and reporting.
 */
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

/**
 * Override layer applied on top of a base `GenerationConfig`.
 * - `undefined`/absent fields inherit from the base.
 * - `0`, `false`, `''` and `[]` are explicit values, not "unset".
 * - `timeout`/`telemetry` merge per field; `telemetry.metadata` replaces the
 *   whole map and arrays replace as a whole.
 * - `maxConcurrent` is a scheduling setting and only exists globally.
 */
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
    vision?: boolean
    unsupportedParameters?: SamplingParameter[]
}

export type ConfigSource = 'global' | 'model' | 'experiment' | 'variant'

export interface ResolvedGenerationConfig {
    /** Merged configuration exactly as requested by all layers. */
    requested: GenerationConfig
    /** Values handed to the AI SDK: requested minus scheduling fields and
     *  parameters excluded by model capabilities. */
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
    providerName?: string // Custom display name for provider
    providerId?: string // e.g. "anthropic/claude-3-opus" for OpenRouter
    apiKey?: string // Optional override
    baseURL?: string // Optional override
    enabled: boolean
    mode?: 'chat' | 'image'
    config?: GenerationConfigPatch // Individual override
    pricing?: { input: number; output: number } // USD per million tokens
    capabilities?: ModelCapabilities
}

/**
 * Frozen identity of a model used by a request or experiment. Never contains
 * `apiKey`; `endpoint` is the sanitized public URL (query/hash stripped).
 */
export interface ModelSnapshot {
    id: string
    name: string
    provider: LLMProvider
    providerName?: string
    providerId?: string
    mode: 'chat' | 'image'
    pricing?: { input: number; output: number }
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

export type LLMProvider =
    | 'openai'
    | 'anthropic'
    | 'openrouter'
    | 'google'
    | 'deepseek'
    | 'custom'
    | 'other' // Legacy custom provider data

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
    tokenSource?: 'api' | 'estimated'
    reasoningTokens?: number
}

export interface BenchmarkResult {
    id: string
    modelId: string
    prompt: string
    response: string
    reasoning?: string // Chain-of-thought / thinking content
    metrics: BenchmarkMetrics
    timestamp: number
    error?: string
    rating?: number // 1-5 score
    ratingSource?: 'human' | 'ai'
    status?: 'pending' | 'completed' | 'error' | 'cancelled'
    requestSnapshot?: RequestSnapshot
    /** Set for attempts recorded inside an experiment run. */
    experiment?: { runId: string; taskId: string; attempt: number }
}

export interface ChatSession {
    id: string
    title: string
    messages: Message[]
    models: string[] // List of model IDs participating
    results: Record<string, BenchmarkResult[]> // Keyed by modelId
    createdAt: number
}

export interface TestCase {
    id: string
    prompt: string
    expected?: string
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
