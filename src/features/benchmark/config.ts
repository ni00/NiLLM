import type {
    ConfigSource,
    GenerationConfig,
    GenerationConfigPatch,
    ResolvedGenerationConfig,
    TelemetryConfig,
    TelemetryConfigPatch,
    TimeoutConfig
} from '@/lib/types'

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
        ...patch,
        isEnabled: patch.isEnabled ?? base?.isEnabled ?? false
    }
    // `metadata` replaces the whole map when the patch provides one.
    if (!('metadata' in patch)) delete merged.metadata
    return merged
}

/**
 * Layered merge with patch semantics: absent or `undefined` fields inherit the
 * base; `0`, `false`, `''` and `[]` are explicit values. `timeout`/`telemetry`
 * merge per field; `telemetry.metadata` replaces the whole map.
 */
export function mergeGenerationConfig(
    base: GenerationConfig,
    patch: GenerationConfigPatch
): GenerationConfig {
    const merged: GenerationConfig = { ...base }
    for (const key of SCALAR_KEYS) {
        if (patch[key] !== undefined)
            Object.assign(merged, { [key]: patch[key] })
    }
    if (patch.timeout) merged.timeout = { ...base.timeout, ...patch.timeout }
    if (patch.telemetry)
        merged.telemetry = mergeTelemetryConfig(base.telemetry, patch.telemetry)
    return merged
}

/**
 * Folds an editor patch into an existing override layer. `undefined` values
 * mean "cleared", so the field goes back to inheriting; emptied nested
 * objects are removed so `Object.keys(patch)` reflects real overrides.
 */
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
        if (!('metadata' in incoming.telemetry)) delete telemetry.metadata
        for (const key of TELEMETRY_KEYS)
            if (telemetry[key] === undefined) delete telemetry[key]
        if (Object.keys(telemetry).length > 0) result.telemetry = telemetry
        else delete result.telemetry
    }
    return result
}

/**
 * Removes one overridden field (dot path such as `timeout.totalMs`) so it
 * inherits again; emptied nested objects and an emptied patch vanish.
 */
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

/**
 * Resolves the fixed precedence global → model → experiment → variant and
 * records where every field came from. `requested` is the full merge;
 * `effective` is what execution may send (scheduling fields excluded).
 */
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
            timeout = { ...timeout, ...patch.timeout }
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
