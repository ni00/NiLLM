import type {
    ConfigSource,
    GenerationConfig,
    GenerationConfigPatch,
    ModelCapabilities,
    LLMModel,
    ResolvedGenerationConfig,
    TelemetryConfig,
    TelemetryConfigPatch,
    TimeoutConfig
} from '@/lib/types'
import { resolveDecisionProtocol } from '@/lib/providers/decisions'

const SCALAR_KEYS = [
    'temperature',
    'maxTokens',
    'topP',
    'topK',
    'frequencyPenalty',
    'presencePenalty',
    'repetitionPenalty',
    'seed',
    'stopSequences',
    'minP',
    'systemPrompt',
    'connectTimeout',
    'readTimeout'
] as const satisfies readonly (keyof GenerationConfigPatch &
    keyof GenerationConfig)[]

const TIMEOUT_KEYS = ['totalMs', 'stepMs', 'chunkMs'] as const
const TELEMETRY_KEYS = [
    'isEnabled',
    'functionId',
    'recordInputs',
    'recordOutputs',
    'metadata'
] as const

/** Undefined `isEnabled` inherits the base; no base means disabled. */
function mergeTelemetryConfig(
    base: TelemetryConfig | undefined,
    patch: TelemetryConfigPatch
): TelemetryConfig {
    const merged: TelemetryConfig = {
        ...base,
        isEnabled: patch.isEnabled ?? base?.isEnabled ?? false
    }
    for (const field of TELEMETRY_KEYS)
        if (patch[field] !== undefined)
            Object.assign(merged, { [field]: patch[field] })
    return merged
}

function mergeTimeoutConfig(
    base: TimeoutConfig | undefined,
    patch: TimeoutConfig
): TimeoutConfig {
    const merged = { ...base }
    for (const field of TIMEOUT_KEYS)
        if (patch[field] !== undefined) merged[field] = patch[field]
    return merged
}

/** Absent fields inherit; zero/false/empty values override. Nested fields
 * merge individually, except metadata which replaces the whole map. */
export function mergeGenerationConfig(
    base: GenerationConfig,
    patch: GenerationConfigPatch
): GenerationConfig {
    const merged: GenerationConfig = { ...base }
    for (const key of SCALAR_KEYS) {
        if (patch[key] !== undefined)
            Object.assign(merged, { [key]: patch[key] })
    }
    if (patch.timeout)
        merged.timeout = mergeTimeoutConfig(base.timeout, patch.timeout)
    if (patch.telemetry)
        merged.telemetry = mergeTelemetryConfig(base.telemetry, patch.telemetry)
    return merged
}

/** Apply an editor patch; undefined clears overrides, removing empty nested layers. */
export function mergeConfigPatch(
    current: GenerationConfigPatch,
    incoming: GenerationConfigPatch
): GenerationConfigPatch {
    const result: GenerationConfigPatch = { ...current }
    for (const key of SCALAR_KEYS) {
        if (!(key in incoming)) continue
        if (incoming[key] === undefined) delete result[key]
        else Object.assign(result, { [key]: incoming[key] })
    }
    if (incoming.timeout) {
        const timeout: TimeoutConfig = {
            ...result.timeout,
            ...incoming.timeout
        }
        for (const field of TIMEOUT_KEYS)
            if (timeout[field] === undefined) delete timeout[field]
        if (Object.keys(timeout).length > 0) result.timeout = timeout
        else delete result.timeout
    }
    if (incoming.telemetry) {
        const telemetry: TelemetryConfigPatch = {
            ...result.telemetry,
            ...incoming.telemetry
        }
        for (const key of TELEMETRY_KEYS)
            if (telemetry[key] === undefined) delete telemetry[key]
        if (Object.keys(telemetry).length > 0) result.telemetry = telemetry
        else delete result.telemetry
    }
    return result
}

/** Clear a dot-path override so it inherits again; remove empty parent layers. */
export function resetConfigField(
    patch: GenerationConfigPatch,
    path: string
): GenerationConfigPatch {
    const incoming: GenerationConfigPatch = {}
    const nested = /^(timeout|telemetry)\.(.+)$/.exec(path)
    if (nested) {
        const [, group, field] = nested
        if (group === 'timeout') {
            const timeout: TimeoutConfig = {}
            Object.assign(timeout, { [field]: undefined })
            incoming.timeout = timeout
        } else {
            const telemetry: TelemetryConfigPatch = {}
            Object.assign(telemetry, { [field]: undefined })
            incoming.telemetry = telemetry
        }
    } else {
        Object.assign(incoming, { [path]: undefined })
    }
    const result = mergeConfigPatch(patch, incoming)
    return Object.keys(result).length > 0 ? result : {}
}

/** Resolve global → model → experiment → variant with field provenance;
 * scheduling settings stay out of the effective request. */
export function resolveGenerationConfig(
    global: GenerationConfig,
    model?: GenerationConfigPatch,
    experiment?: GenerationConfigPatch,
    variant?: GenerationConfigPatch
): ResolvedGenerationConfig {
    const requested: GenerationConfig = { ...global }
    const sources: Record<string, ConfigSource> = {}

    for (const key of SCALAR_KEYS)
        if (global[key] !== undefined) sources[key] = 'global'
    for (const field of TIMEOUT_KEYS)
        if (global.timeout?.[field] !== undefined)
            sources[`timeout.${field}`] = 'global'
    for (const field of TELEMETRY_KEYS)
        if (global.telemetry?.[field] !== undefined)
            sources[`telemetry.${field}`] = 'global'

    const layers: Array<[ConfigSource, GenerationConfigPatch | undefined]> = [
        ['model', model],
        ['experiment', experiment],
        ['variant', variant]
    ]
    let timeout: TimeoutConfig | undefined = global.timeout
        ? { ...global.timeout }
        : undefined
    let telemetry: TelemetryConfig | undefined = global.telemetry
        ? { ...global.telemetry }
        : undefined

    for (const [source, patch] of layers) {
        if (!patch) continue
        for (const key of SCALAR_KEYS) {
            if (patch[key] === undefined) continue
            Object.assign(requested, { [key]: patch[key] })
            sources[key] = source
        }
        if (patch.timeout) {
            timeout = mergeTimeoutConfig(timeout, patch.timeout)
            for (const field of TIMEOUT_KEYS)
                if (patch.timeout[field] !== undefined)
                    sources[`timeout.${field}`] = source
        }
        if (patch.telemetry) {
            telemetry = mergeTelemetryConfig(telemetry, patch.telemetry)
            for (const field of TELEMETRY_KEYS)
                if (patch.telemetry[field] !== undefined)
                    sources[`telemetry.${field}`] = source
        }
    }

    if (timeout && Object.keys(timeout).length === 0) timeout = undefined
    requested.timeout = timeout
    requested.telemetry = telemetry

    const effective: Partial<GenerationConfig> = { ...requested }
    delete effective.maxConcurrent
    return {
        requested,
        effective,
        sources,
        excludedParameters: []
    }
}

/** Exclude declared unsupported parameters while retaining the requested values. */
export function applyModelCapabilities(
    resolved: ResolvedGenerationConfig,
    capabilities?: ModelCapabilities,
    model?: Pick<LLMModel, 'provider' | 'mode'> &
        Partial<Pick<LLMModel, 'id' | 'providerId' | 'decisionProtocol'>>
): ResolvedGenerationConfig {
    const excluded = new Set<string>([
        ...resolved.excludedParameters,
        ...(capabilities?.unsupportedParameters ?? [])
    ])
    if (model?.mode === 'decision' || model?.provider === 'typesafe') {
        if (resolved.requested.systemPrompt !== undefined)
            excluded.add('systemPrompt')
        if (resolved.requested.stopSequences !== undefined)
            excluded.add('stopSequences')
        const protocol = resolveDecisionProtocol(model)
        if (protocol === 'system-one') {
            for (const key of SCALAR_KEYS)
                if (
                    key !== 'connectTimeout' &&
                    key !== 'readTimeout' &&
                    resolved.requested[key] !== undefined
                )
                    excluded.add(key)
            if (resolved.requested.telemetry !== undefined)
                excluded.add('telemetry')
        } else if (protocol === 'openai-responses') {
            for (const key of [
                'topK',
                'frequencyPenalty',
                'presencePenalty',
                'repetitionPenalty',
                'seed',
                'minP',
                'telemetry'
            ] as const)
                if (resolved.requested[key] !== undefined) excluded.add(key)
        }
    }
    if (
        excluded.size === 0 &&
        model?.mode !== 'decision' &&
        model?.provider !== 'typesafe'
    )
        return resolved
    const effective = { ...resolved.effective }
    for (const parameter of excluded)
        delete effective[parameter as keyof GenerationConfig]
    if (model?.mode === 'decision' || model?.provider === 'typesafe') {
        for (const key of ['stepMs', 'chunkMs'] as const) {
            if (effective.timeout?.[key] !== undefined)
                excluded.add(`timeout.${key}`)
        }
        effective.timeout =
            effective.timeout?.totalMs !== undefined
                ? { totalMs: effective.timeout.totalMs }
                : undefined
        for (const key of ['connectTimeout', 'readTimeout'] as const) {
            if (effective[key] !== undefined) excluded.add(key)
            delete effective[key]
        }
    }
    return {
        ...resolved,
        effective,
        excludedParameters: [...excluded]
    }
}
