export interface GenerationConfig {
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
    connectTimeout?: number // ms
    readTimeout?: number // ms
}

export interface LLMModel {
    id: string
    name: string
    provider: 'openai' | 'anthropic' | 'openrouter' | 'google' | 'other'
    providerName?: string // Custom display name for provider
    providerId?: string // e.g. "anthropic/claude-3-opus" for OpenRouter
    apiKey?: string // Optional override
    baseURL?: string // Optional override
    enabled: boolean
    config?: Partial<GenerationConfig> // Individual override
}

export type LLMProvider =
    | 'openai'
    | 'anthropic'
    | 'openrouter'
    | 'google'
    | 'custom'

export interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface BenchmarkMetrics {
    ttft: number // Time to First Token (ms)
    tps: number // Tokens Per Second
    totalDuration: number // Total generation time (ms)
    tokenCount: number
    cost?: number // Estimated cost
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
