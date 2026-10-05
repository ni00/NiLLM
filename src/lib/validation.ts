import { z } from 'zod'
import { PROVIDER_IDS, SAMPLING_PARAMETERS } from './types'
import {
    parseDecisionPrompt,
    validateDecisionExpected
} from '@/features/decisions/domain'
import type {
    BenchmarkResult,
    ChatSession,
    GenerationConfig,
    GenerationConfigPatch,
    LLMModel,
    JudgeEvaluation,
    ModelSnapshot,
    PromptTemplate,
    RequestSnapshot,
    RuleEvaluation,
    TestCase,
    TestSet
} from './types'

const finite = z.number().finite()
const positive = finite.positive()
const nonnegative = finite.nonnegative()
const pricingSchema = z.object({
    input: nonnegative,
    output: nonnegative,
    cacheRead: nonnegative.optional(),
    cacheWrite: nonnegative.optional()
})
const providerEnum = z.enum(PROVIDER_IDS)
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
    chatProtocol: z.enum(['openai-compatible', 'anthropic']).optional(),
    vision: z.boolean().optional(),
    unsupportedParameters: z.array(z.enum(SAMPLING_PARAMETERS)).optional()
})
const decisionProtocolSchema = z.enum([
    'structured',
    'system-one',
    'openai-responses'
])

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

export const parameterPresetSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    config: generationConfigPatchSchema.strict(),
    createdAt: nonnegative,
    updatedAt: nonnegative
})

/** Request fields may be absent after capability filtering; telemetry remains fully resolved. */
const effectiveConfigSchema = generationConfigPatchSchema.extend({
    telemetry: telemetryFullSchema.optional()
})

export const modelSnapshotSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: providerEnum,
    providerName: z.string().optional(),
    providerId: z.string().optional(),
    mode: z.enum(['chat', 'image', 'decision']),
    decisionProtocol: decisionProtocolSchema.optional(),
    pricing: pricingSchema.optional(),
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

/** Drop legacy per-model concurrency instead of rejecting older records. */
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
    z
        .object({
            id: z.string().trim().min(1),
            name: z.string().trim().min(1),
            provider: providerEnum,
            providerId: z.string().optional(),
            providerName: z.string().optional(),
            apiKey: z.string().optional(),
            baseURL: z.string().optional(),
            enabled: z.boolean(),
            mode: z.enum(['chat', 'image', 'decision']).optional(),
            decisionProtocol: decisionProtocolSchema.optional(),
            config: generationConfigPatchSchema.optional(),
            pricing: pricingSchema.optional(),
            capabilities: capabilitiesSchema.optional()
        })
        .superRefine((model, context) => {
            if (model.provider === 'typesafe' && model.mode !== 'decision')
                context.addIssue({
                    code: 'custom',
                    path: ['mode'],
                    message: 'TypeSafe models require decision mode.'
                })
        }) satisfies z.ZodType<LLMModel>
)
const evaluationTypeSchema = z.enum(['exact', 'contains', 'json', 'decision'])
export const ruleEvaluationSchema = z.object({
    type: evaluationTypeSchema,
    passed: z.boolean(),
    evaluatedAt: nonnegative,
    reason: z.string().optional()
}) satisfies z.ZodType<RuleEvaluation>

const judgeScore = finite.int().min(1).max(5)
export const judgeEvaluationSchema = z.object({
    judgeCallId: z.string().min(1),
    accuracy: judgeScore,
    instructionFollowing: judgeScore,
    completeness: judgeScore,
    rationale: z.string(),
    judge: modelSnapshotSchema,
    judgeConfig: effectiveConfigSchema,
    judgePrompt: z.string(),
    judgedAt: nonnegative,
    usage: z
        .object({
            inputTokens: nonnegative.optional(),
            outputTokens: nonnegative.optional(),
            cost: nonnegative.optional()
        })
        .optional()
}) satisfies z.ZodType<JudgeEvaluation>

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
    ratedAt: nonnegative.optional(),
    ruleEvaluation: ruleEvaluationSchema.optional(),
    judgeEvaluation: judgeEvaluationSchema.optional(),
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
        costSource: z.enum(['api', 'estimated']).optional(),
        cacheReadTokens: nonnegative.int().optional(),
        cacheWriteTokens: nonnegative.int().optional(),
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
export const testCaseSchema = z
    .object({
        id: z.string(),
        prompt: z.string(),
        expected: z.string().optional(),
        evaluation: z
            .object({
                type: evaluationTypeSchema,
                tolerance: nonnegative.optional()
            })
            .optional()
    })
    .superRefine((testCase, context) => {
        if (testCase.expected === undefined) {
            if (testCase.evaluation)
                context.addIssue({
                    code: 'custom',
                    path: ['expected'],
                    message:
                        'An expected answer is required for the scoring rule.'
                })
            return
        }
        const type = testCase.evaluation?.type ?? 'exact'
        if (type === 'decision') {
            try {
                validateDecisionExpected(
                    parseDecisionPrompt(testCase.prompt),
                    JSON.parse(testCase.expected)
                )
            } catch {
                context.addIssue({
                    code: 'custom',
                    path: ['expected'],
                    message:
                        'Decision scoring needs a valid decision prompt and expected values by question ID.'
                })
            }
        }
        if (type === 'contains' && !testCase.expected.trim())
            context.addIssue({
                code: 'custom',
                path: ['expected'],
                message:
                    'Contains scoring requires a non-empty expected answer.'
            })
        if (type === 'json') {
            try {
                JSON.parse(testCase.expected)
            } catch {
                context.addIssue({
                    code: 'custom',
                    path: ['expected'],
                    message: 'The expected answer must be valid JSON.'
                })
            }
        }
    }) satisfies z.ZodType<TestCase>

export const testSetSchema = z.object({
    id: z.string(),
    name: z.string(),
    cases: z.array(testCaseSchema),
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
        parameterPresets: z.array(parameterPresetSchema).optional(),
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
