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
    config?: Partial<GenerationConfig> // Individual override
    pricing?: { input: number; output: number } // USD per million tokens
}

export type LLMProvider =
    | 'openai'
    | 'anthropic'
    | 'openrouter'
    | 'google'
    | 'deepseek'
    | 'custom'
    | 'other' // Legacy custom provider data

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
