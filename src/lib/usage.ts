import type {
    BenchmarkMetrics,
    BenchmarkResult,
    LLMModel,
    ModelPricing
} from './types'
import { resolveModelPricing } from './providers/presets'

export interface TokenUsage {
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    reportedCost?: number
}
export const nonnegativeNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined
const tokens = (value: unknown) => {
    const number = nonnegativeNumber(value)
    return number !== undefined && Number.isInteger(number) ? number : undefined
}
const object = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {}

/** Whitelist numbers only: raw provider payloads never enter stored results. */
export function normalizeUsage(usage: {
    inputTokens?: number
    outputTokens?: number
    raw?: unknown
    inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
    outputTokenDetails?: { reasoningTokens?: number }
}): TokenUsage {
    const raw = object(usage.raw)
    const inputDetails = object(
        raw.prompt_tokens_details ?? raw.input_tokens_details
    )
    const sdkCache = (value: unknown) => {
        const count = tokens(value)
        // SDK adapters synthesize zero when the provider omits cache fields.
        return (count !== undefined && count > 0) || usage.raw === undefined
            ? count
            : undefined
    }
    const reportedInput = tokens(
        raw.prompt_tokens ?? raw.input_tokens ?? raw.promptTokenCount
    )
    const reportedOutput = tokens(
        raw.completion_tokens ?? raw.output_tokens ?? raw.candidatesTokenCount
    )
    return {
        inputTokens:
            usage.inputTokens === 0 &&
            usage.raw !== undefined &&
            reportedInput === undefined
                ? undefined
                : (tokens(usage.inputTokens) ?? reportedInput),
        outputTokens:
            usage.outputTokens === 0 &&
            usage.raw !== undefined &&
            reportedOutput === undefined
                ? undefined
                : (tokens(usage.outputTokens) ?? reportedOutput),
        reasoningTokens: tokens(usage.outputTokenDetails?.reasoningTokens),
        cacheReadTokens:
            tokens(inputDetails.cached_tokens) ??
            tokens(raw.prompt_cache_hit_tokens) ??
            tokens(raw.cache_read_input_tokens) ??
            tokens(raw.cachedContentTokenCount) ??
            sdkCache(usage.inputTokenDetails?.cacheReadTokens),
        cacheWriteTokens:
            tokens(inputDetails.cache_write_tokens) ??
            tokens(raw.cache_creation_input_tokens) ??
            sdkCache(usage.inputTokenDetails?.cacheWriteTokens),
        reportedCost: nonnegativeNumber(raw.cost)
    }
}

export function usageMetrics(
    usage: TokenUsage | undefined,
    pricing?: ModelPricing
) {
    const inputTokens = tokens(usage?.inputTokens)
    const outputTokens = tokens(usage?.outputTokens)
    let cacheReadTokens = tokens(usage?.cacheReadTokens)
    let cacheWriteTokens = tokens(usage?.cacheWriteTokens)
    if (inputTokens !== undefined) {
        if (cacheReadTokens !== undefined && cacheReadTokens > inputTokens)
            cacheReadTokens = undefined
        if (cacheWriteTokens !== undefined && cacheWriteTokens > inputTokens)
            cacheWriteTokens = undefined
        if ((cacheReadTokens ?? 0) + (cacheWriteTokens ?? 0) > inputTokens) {
            cacheReadTokens = undefined
            cacheWriteTokens = undefined
        }
    }
    const reportedCost = nonnegativeNumber(usage?.reportedCost)
    const read = cacheReadTokens ?? 0,
        write = cacheWriteTokens ?? 0
    const estimatedCost =
        pricing && inputTokens !== undefined && outputTokens !== undefined
            ? nonnegativeNumber(
                  ((inputTokens - read - write) * pricing.input +
                      read * (pricing.cacheRead ?? pricing.input) +
                      write * (pricing.cacheWrite ?? pricing.input) +
                      outputTokens * pricing.output) /
                      1e6
              )
            : undefined
    const cost = reportedCost ?? estimatedCost
    return {
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        reasoningTokens: tokens(usage?.reasoningTokens),
        cost,
        costSource:
            reportedCost !== undefined
                ? ('api' as const)
                : estimatedCost !== undefined
                  ? ('estimated' as const)
                  : undefined
    }
}

export function cacheHitRate(
    metrics: Pick<BenchmarkMetrics, 'cacheReadTokens' | 'inputTokens'>
) {
    const input = tokens(metrics.inputTokens),
        read = tokens(metrics.cacheReadTokens)
    return input !== undefined &&
        input > 0 &&
        read !== undefined &&
        read <= input
        ? (read / input) * 100
        : undefined
}

/** Fill missing historical costs without changing recorded bills or tokens. */
export function withEstimatedCost(
    result: BenchmarkResult,
    model?: LLMModel
): BenchmarkResult {
    if (
        nonnegativeNumber(result.metrics.cost) !== undefined ||
        result.error ||
        (result.status !== undefined && result.status !== 'completed')
    )
        return result
    const snapshot = result.requestSnapshot?.model
    const identity = snapshot
        ? { ...snapshot, baseURL: snapshot.endpoint }
        : model
    if (!identity) return result
    const pricing = resolveModelPricing(identity)
    if (!pricing) return result
    const { cost, costSource } = usageMetrics(result.metrics, pricing)
    return cost === undefined
        ? result
        : {
              ...result,
              metrics: { ...result.metrics, cost, costSource }
          }
}

/** Sum known costs; weight cache hits by input tokens, never by response count. */
export function summarizeUsage(metrics: BenchmarkMetrics[]) {
    const priced = metrics.filter(
        (entry) => nonnegativeNumber(entry.cost) !== undefined
    )
    const cached = metrics.filter((entry) => cacheHitRate(entry) !== undefined)
    return {
        cost: priced.length
            ? priced.reduce((sum, entry) => sum + entry.cost!, 0)
            : undefined,
        costSource:
            priced.length && priced.every((entry) => entry.costSource === 'api')
                ? ('api' as const)
                : priced.some((entry) => entry.costSource === 'estimated')
                  ? ('estimated' as const)
                  : undefined,
        cacheReadTokens: cached.length
            ? cached.reduce((sum, entry) => sum + entry.cacheReadTokens!, 0)
            : undefined,
        inputTokens: cached.length
            ? cached.reduce((sum, entry) => sum + entry.inputTokens!, 0)
            : undefined,
        cacheWriteTokens: metrics.some(
            (entry) => tokens(entry.cacheWriteTokens) !== undefined
        )
            ? metrics.reduce(
                  (sum, entry) => sum + (tokens(entry.cacheWriteTokens) ?? 0),
                  0
              )
            : undefined,
        costSamples: priced.length,
        cacheSamples: cached.length,
        totalSamples: metrics.length
    }
}

export function formatUsageCost(cost: number | undefined) {
    if (nonnegativeNumber(cost) === undefined) return '—'
    if (cost! > 0 && cost! < 1e-8) return `$${cost!.toExponential(2)}`
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 8
    }).format(cost!)
}
