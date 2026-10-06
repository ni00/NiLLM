import type {
    BenchmarkResult,
    GenerationConfig,
    GenerationConfigPatch,
    JudgeEvaluation,
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
import type { ModelStat } from '@/lib/statistics'
import type {
    ReportGenerationConfig,
    ReportJudgeEvaluation,
    ReportModelSnapshot,
    ReportRequestSnapshot,
    ReportResolvedGenerationConfig,
    ReportTelemetryConfig,
    ReportTimeoutConfig
} from './report-types'

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

export function sanitizeTelemetry(
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
export function sanitizeConfigObject(
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

export function sanitizeResolvedConfig(
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
export function sanitizeUnknown(
    value: unknown,
    content: boolean,
    depth = 0
): unknown {
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

export function publicRequestSnapshot(
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

export function publicMetrics(result: BenchmarkResult) {
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

export function publicQuality(result: BenchmarkResult, content: boolean) {
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
