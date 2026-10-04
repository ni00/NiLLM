import type { BenchmarkResult, ChatSession, LLMModel } from '@/lib/types'
export const model = (
    id = 'a',
    overrides: Partial<LLMModel> = {}
): LLMModel => ({
    id,
    name: id.toUpperCase(),
    provider: 'deepseek',
    providerId: id,
    enabled: true,
    ...overrides
})
export const result = (
    id = 'r',
    overrides: Partial<BenchmarkResult> = {}
): BenchmarkResult => ({
    id,
    modelId: 'a',
    prompt: 'Hello',
    response: 'Hi',
    timestamp: 1000,
    status: 'completed',
    metrics: {
        ttft: 100,
        tps: 20,
        totalDuration: 1000,
        tokenCount: 18,
        inputTokens: 3,
        outputTokens: 18,
        tokenSource: 'api'
    },
    ...overrides
})
export const session = (
    results: Record<string, BenchmarkResult[]>,
    overrides: Partial<ChatSession> = {}
): ChatSession => ({
    id: 's',
    title: 'Example',
    models: Object.keys(results),
    messages: [],
    results,
    createdAt: 1,
    ...overrides
})
