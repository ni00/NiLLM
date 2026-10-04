import { z } from 'zod'
import { SAMPLING_PARAMETERS } from './types'
import type {
    BenchmarkResult,
    ChatSession,
    GenerationConfig,
    GenerationConfigPatch,
    LLMModel,
    ModelSnapshot,
    PromptTemplate,
    RequestSnapshot,
    TestSet
} from './types'

const finite = z.number().finite()
const positive = finite.positive()
const nonnegative = finite.nonnegative()
const providerEnum = z.enum([
    'openai',
    'openrouter',
    'anthropic',
    'google',
    'deepseek',
    'custom',
    'other'
])
const timeoutPatchSchema = z.object({
    totalMs: positive.optional(),
    stepMs: positive.optional(),
    chunkMs: positive.optional()
})
const telemetryPatchSchema = z.object({
    isEnabled: z.boolean().optional(),
    functionId: z.string().optional(),
    recordInputs: z.boolean().optional(),
    recordOutputs: z.boolean().optional(),
    metadata: z
        .record(z.string(), z.union([z.string(), finite, z.boolean()]))
        .optional()
})
const capabilitiesSchema = z.object({
    vision: z.boolean().optional(),
    unsupportedParameters: z.array(z.enum(SAMPLING_PARAMETERS)).optional()
})

/** Override layer: field-level timeout/telemetry merges, no `maxConcurrent`. */
export const generationConfigPatchSchema = z.object({
    temperature: nonnegative.optional(),
    maxTokens: positive.optional(),
    topP: nonnegative.max(1).optional(),
    topK: nonnegative.optional(),
    frequencyPenalty: finite.optional(),
    presencePenalty: finite.optional(),
    repetitionPenalty: finite.optional(),
    seed: finite.optional(),
    stopSequences: z.array(z.string()).optional(),
    minP: nonnegative.max(1).optional(),
    systemPrompt: z.string().optional(),
    connectTimeout: positive.optional(),
    readTimeout: positive.optional(),
    timeout: timeoutPatchSchema.optional(),
    telemetry: telemetryPatchSchema.optional()
}) satisfies z.ZodType<GenerationConfigPatch>

const telemetryFullSchema = z.object({
    isEnabled: z.boolean(),
    functionId: z.string().optional(),
    recordInputs: z.boolean().optional(),
    recordOutputs: z.boolean().optional(),
    metadata: z
        .record(z.string(), z.union([z.string(), finite, z.boolean()]))
        .optional()
})

/** Full global configuration: complete sampling values plus scheduling. */
export const generationConfigSchema = generationConfigPatchSchema.extend({
    temperature: nonnegative,
    maxTokens: positive,
    topP: nonnegative.max(1),
    maxConcurrent: positive.max(16).optional(),
    telemetry: telemetryFullSchema.optional()
}) satisfies z.ZodType<GenerationConfig>

/**
 * Effective request payload: all-optional (capability filtering may drop
 * fields) but telemetry, when present, is always fully resolved.
 */
const effectiveConfigSchema = generationConfigPatchSchema.extend({
    telemetry: telemetryFullSchema.optional()
})

export const modelSnapshotSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: providerEnum,
    providerName: z.string().optional(),
    providerId: z.string().optional(),
    mode: z.enum(['chat', 'image']),
    pricing: z.object({ input: nonnegative, output: nonnegative }).optional(),
    endpoint: z.string().optional(),
    endpointFingerprint: z.string(),
    capabilities: capabilitiesSchema.optional()
}) satisfies z.ZodType<ModelSnapshot>

const resolvedGenerationConfigSchema = z.object({
    requested: generationConfigSchema,
    effective: effectiveConfigSchema,
    sources: z.record(
        z.string(),
        z.enum(['global', 'model', 'experiment', 'variant'])
    ),
    excludedParameters: z.array(z.string())
})

export const requestSnapshotSchema = z.object({
    schemaVersion: z.literal(1),
    model: modelSnapshotSchema,
    parameters: resolvedGenerationConfigSchema,
    context: z.enum(['conversation', 'independent']),
    capturedAt: nonnegative
}) satisfies z.ZodType<RequestSnapshot>

/**
 * Older builds allowed `model.config.maxConcurrent`; scheduling concurrency is
 * global-only now. Strip the stale field instead of rejecting the whole record.
 */
export function stripLegacyModelConcurrency(value: unknown): unknown {
    if (!Array.isArray(value)) return value
    return value.map((model) => {
        if (!model || typeof model !== 'object' || !('config' in model))
            return model
        const config: unknown = model.config
        if (
            !config ||
            typeof config !== 'object' ||
            !('maxConcurrent' in config)
        )
            return model
        const cleaned = Object.fromEntries(Object.entries(config))
        delete cleaned.maxConcurrent
        return { ...model, config: cleaned }
    })
}

export const modelSchema = z.preprocess(
    stripLegacyModelConcurrency,
    z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
        provider: providerEnum,
        providerId: z.string().optional(),
        providerName: z.string().optional(),
        apiKey: z.string().optional(),
        baseURL: z.string().optional(),
        enabled: z.boolean(),
        mode: z.enum(['chat', 'image']).optional(),
        config: generationConfigPatchSchema.optional(),
        pricing: z
            .object({ input: nonnegative, output: nonnegative })
            .optional(),
        capabilities: capabilitiesSchema.optional()
    }) satisfies z.ZodType<LLMModel>
)
export const resultSchema = z.object({
    id: z.string(),
    modelId: z.string(),
    prompt: z.string(),
    response: z.string(),
    reasoning: z.string().optional(),
    timestamp: nonnegative,
    error: z.string().optional(),
    rating: finite.min(1).max(5).optional(),
    ratingSource: z.enum(['human', 'ai']).optional(),
    status: z.enum(['pending', 'completed', 'error', 'cancelled']).optional(),
    requestSnapshot: requestSnapshotSchema.optional(),
    experiment: z
        .object({
            runId: z.string(),
            taskId: z.string(),
            attempt: finite.int().positive()
        })
        .optional(),
    metrics: z.object({
        ttft: nonnegative,
        tps: nonnegative,
        totalDuration: nonnegative,
        tokenCount: nonnegative,
        inputTokens: nonnegative.optional(),
        outputTokens: nonnegative.optional(),
        reasoningTokens: nonnegative.optional(),
        cost: nonnegative.optional(),
        tokenSource: z.enum(['api', 'estimated']).optional()
    })
}) satisfies z.ZodType<BenchmarkResult>
export const sessionSchema = z.object({
    id: z.string(),
    title: z.string(),
    models: z.array(z.string()),
    messages: z.array(
        z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string()
        })
    ),
    results: z.record(z.string(), z.array(resultSchema)),
    createdAt: nonnegative
}) satisfies z.ZodType<ChatSession>
export const promptSchema = z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    variables: z.array(z.object({ name: z.string(), description: z.string() })),
    createdAt: nonnegative,
    updatedAt: nonnegative
}) satisfies z.ZodType<PromptTemplate>
export const testSetSchema = z.object({
    id: z.string(),
    name: z.string(),
    cases: z.array(
        z.object({
            id: z.string(),
            prompt: z.string(),
            expected: z.string().optional()
        })
    ),
    createdAt: nonnegative
}) satisfies z.ZodType<TestSet>

export const experimentVariantSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    overrides: generationConfigPatchSchema
})
export const experimentTaskSchema = z.object({
    id: z.string().min(1),
    caseId: z.string().min(1),
    modelId: z.string().min(1),
    variantId: z.string().min(1),
    repeatIndex: finite.int().nonnegative(),
    attempts: z.array(resultSchema)
})
export const experimentRunSchema = z
    .object({
        id: z.string().min(1),
        name: z.string().trim().min(1),
        testSet: testSetSchema,
        models: z.array(modelSnapshotSchema),
        variants: z.array(experimentVariantSchema).min(1),
        configByModelVariant: z.record(
            z.string(),
            z.record(z.string(), resolvedGenerationConfigSchema)
        ),
        repetitions: finite.int().min(1).max(20),
        maxConcurrent: finite.int().min(1).max(16),
        tasks: z.array(experimentTaskSchema),
        pendingTaskIds: z.array(z.string()),
        status: z.enum([
            'queued',
            'running',
            'paused',
            'completed',
            'cancelled',
            'interrupted'
        ]),
        createdAt: nonnegative,
        startedAt: nonnegative.optional(),
        finishedAt: nonnegative.optional(),
        error: z.string().optional()
    })
    .superRefine((run, ctx) => {
        const fail = (message: string) =>
            ctx.addIssue({ code: 'custom', message })
        const variantIds = new Set(run.variants.map((v) => v.id))
        if (variantIds.size !== run.variants.length)
            fail('Variant IDs must be unique.')
        const caseIds = new Set(run.testSet.cases.map((c) => c.id))
        if (caseIds.size !== run.testSet.cases.length)
            fail('Case IDs must be unique.')
        const taskIds = new Set<string>()
        for (const task of run.tasks) {
            if (taskIds.has(task.id)) fail('Task IDs must be unique.')
            taskIds.add(task.id)
            if (!caseIds.has(task.caseId))
                fail(`Task ${task.id} references an unknown case.`)
            if (!run.models.some((m) => m.id === task.modelId))
                fail(`Task ${task.id} references an unknown model.`)
            if (!variantIds.has(task.variantId))
                fail(`Task ${task.id} references an unknown variant.`)
            if (task.repeatIndex >= run.repetitions)
                fail(`Task ${task.id} exceeds the repetition count.`)
            task.attempts.forEach((attempt, index) => {
                if (
                    attempt.experiment?.runId !== run.id ||
                    attempt.experiment?.taskId !== task.id ||
                    attempt.experiment?.attempt !== index + 1
                )
                    fail(`Attempt numbering on task ${task.id} is broken.`)
                if (attempt.modelId !== task.modelId)
                    fail(`Attempt model mismatch on task ${task.id}.`)
            })
        }
        for (const model of run.models) {
            for (const variant of run.variants) {
                if (!run.configByModelVariant[model.id]?.[variant.id])
                    fail(
                        `Missing frozen config for ${model.id} × ${variant.id}.`
                    )
            }
        }
        const pending = new Set(run.pendingTaskIds)
        if (pending.size !== run.pendingTaskIds.length)
            fail('pendingTaskIds must be unique.')
        for (const id of run.pendingTaskIds)
            if (!taskIds.has(id)) fail(`Pending task ${id} does not exist.`)
    })
const backupContentSchema = z
    .object({
        models: z.array(modelSchema).optional(),
        sessions: z.array(sessionSchema).optional(),
        testSets: z.array(testSetSchema).optional(),
        experimentRuns: z.array(experimentRunSchema).optional(),
        promptTemplates: z.array(promptSchema).optional(),
        globalConfig: generationConfigSchema.optional(),
        activeModelIds: z.array(z.string()).optional(),
        activeSessionId: z.string().nullable().optional(),
        testSetOrder: z.array(z.string()).optional(),
        language: z.enum(['en', 'zh', 'ja']).optional(),
        benchmarkLanguage: z.enum(['en', 'zh', 'ja']).nullable().optional(),
        theme: z.enum(['system', 'light', 'dark']).optional(),
        density: z.enum(['comfortable', 'compact']).optional(),
        arenaColumns: finite.int().min(0).max(5).optional(),
        arenaSortBy: z
            .enum(['default', 'name', 'ttft', 'tps', 'rating'])
            .optional()
    })
    .refine(
        (data) => Object.keys(data).length > 0,
        'No application data found.'
    )

/** Accepts the `{schemaVersion: 1, state}` envelope and legacy bare backups. */
export const backupSchema = z
    .union([
        z.object({ schemaVersion: z.literal(1), state: z.unknown() }),
        backupContentSchema
    ])
    .transform((value) =>
        'schemaVersion' in value
            ? (value.state as Record<string, unknown>)
            : value
    )
    .pipe(backupContentSchema)

export type BackupData = z.output<typeof backupContentSchema>

export function parseModels(value: unknown): LLMModel[] {
    return z.array(modelSchema).parse(value)
}
export function parseBackup(value: unknown): BackupData {
    return backupSchema.parse(value)
}
