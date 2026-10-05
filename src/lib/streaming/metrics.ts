import type { BenchmarkMetrics, LLMModel } from '@/lib/types'
import { usageMetrics, type TokenUsage } from '@/lib/usage'

export function estimateTokens(text: string): number {
    const cjk =
        text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0
    return Math.ceil(cjk * 1.5 + (text.length - cjk) / 4)
}

/** Count deltas once, without retaining or rescanning the response. */
export function createTokenCounter() {
    let length = 0,
        cjk = 0
    return {
        add(text: string) {
            length += text.length
            for (let index = 0; index < text.length; index++) {
                const char = text.charCodeAt(index)
                if (
                    (char >= 0x3400 && char <= 0x9fff) ||
                    (char >= 0x3040 && char <= 0x30ff) ||
                    (char >= 0xac00 && char <= 0xd7af)
                )
                    cjk++
            }
        },
        count: () => Math.ceil(cjk * 1.5 + (length - cjk) / 4)
    }
}

export function streamMetrics(
    start: number,
    now: number,
    firstToken: number | undefined,
    estimatedTokens: number,
    usage?: TokenUsage,
    pricing?: LLMModel['pricing']
): BenchmarkMetrics {
    const measured = usageMetrics(usage, pricing)
    const apiTokens = measured.outputTokens
    const tokenCount = apiTokens !== undefined ? apiTokens : estimatedTokens
    const generationSeconds =
        firstToken !== undefined ? (now - firstToken) / 1000 : 0
    return {
        ttft: firstToken !== undefined ? Math.max(0, firstToken - start) : 0,
        tps: generationSeconds > 0 ? tokenCount / generationSeconds : 0,
        totalDuration: Math.max(0, now - start),
        tokenCount,
        ...measured,
        tokenSource: apiTokens !== undefined ? 'api' : 'estimated'
    }
}
