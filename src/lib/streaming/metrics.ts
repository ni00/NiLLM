import type { BenchmarkMetrics, LLMModel } from '@/lib/types'

export function estimateTokens(text: string): number {
    const cjk =
        text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0
    return Math.ceil(cjk * 1.5 + (text.length - cjk) / 4)
}

export function streamMetrics(
    start: number,
    now: number,
    firstToken: number | undefined,
    estimatedTokens: number,
    usage?: {
        inputTokens?: number
        outputTokens?: number
        reasoningTokens?: number
    },
    pricing?: LLMModel['pricing']
): BenchmarkMetrics {
    const apiTokens = usage?.outputTokens
    const tokenCount = apiTokens !== undefined ? apiTokens : estimatedTokens
    const generationSeconds =
        firstToken !== undefined ? (now - firstToken) / 1000 : 0
    const cost =
        pricing && usage?.inputTokens !== undefined && apiTokens !== undefined
            ? (usage.inputTokens * pricing.input + apiTokens * pricing.output) /
              1e6
            : undefined
    return {
        ttft: firstToken !== undefined ? Math.max(0, firstToken - start) : 0,
        tps: generationSeconds > 0 ? tokenCount / generationSeconds : 0,
        totalDuration: Math.max(0, now - start),
        tokenCount,
        inputTokens: usage?.inputTokens,
        outputTokens: apiTokens,
        reasoningTokens: usage?.reasoningTokens,
        tokenSource: apiTokens !== undefined ? 'api' : 'estimated',
        cost
    }
}
