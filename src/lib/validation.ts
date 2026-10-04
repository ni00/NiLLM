import { z } from 'zod'
import type {
    BenchmarkResult,
    ChatSession,
    GenerationConfig,
    LLMModel,
    PromptTemplate,
    TestSet
} from './types'

const finite = z.number().finite()
const positive = finite.positive()
const nonnegative = finite.nonnegative()
export const generationConfigSchema = z.object({
    temperature: nonnegative,
    maxTokens: positive,
    topP: nonnegative.max(1),
    maxConcurrent: positive.max(16).optional(),
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
    timeout: z
        .object({
            totalMs: positive.optional(),
            stepMs: positive.optional(),
            chunkMs: positive.optional()
        })
        .optional(),
    telemetry: z
        .object({
            isEnabled: z.boolean(),
            functionId: z.string().optional(),
            recordInputs: z.boolean().optional(),
            recordOutputs: z.boolean().optional(),
            metadata: z
                .record(z.string(), z.union([z.string(), finite, z.boolean()]))
                .optional()
        })
        .optional()
}) satisfies z.ZodType<GenerationConfig>
export const modelSchema = z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    provider: z.enum([
        'openai',
        'openrouter',
        'anthropic',
        'google',
        'deepseek',
        'custom',
        'other'
    ]),
    providerId: z.string().optional(),
    providerName: z.string().optional(),
    apiKey: z.string().optional(),
    baseURL: z.string().optional(),
    enabled: z.boolean(),
    mode: z.enum(['chat', 'image']).optional(),
    config: generationConfigSchema.partial().optional(),
    pricing: z.object({ input: nonnegative, output: nonnegative }).optional()
}) satisfies z.ZodType<LLMModel>
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
export const backupSchema = z
    .object({
        models: z.array(modelSchema).optional(),
        sessions: z.array(sessionSchema).optional(),
        testSets: z.array(testSetSchema).optional(),
        promptTemplates: z.array(promptSchema).optional(),
        globalConfig: generationConfigSchema.optional(),
        activeModelIds: z.array(z.string()).optional(),
        activeSessionId: z.string().nullable().optional(),
        testSetOrder: z.array(z.string()).optional(),
        language: z.enum(['en', 'zh', 'ja']).optional(),
        arenaColumns: finite.int().min(0).max(5).optional(),
        arenaSortBy: z
            .enum(['default', 'name', 'ttft', 'tps', 'rating'])
            .optional()
    })
    .refine(
        (data) => Object.keys(data).length > 0,
        'No application data found.'
    )

export function parseModels(value: unknown): LLMModel[] {
    return z.array(modelSchema).parse(value)
}
export function parseBackup(value: unknown) {
    return backupSchema.parse(value)
}
