import type {
    ExperimentDraft,
    ExperimentRun,
    ExperimentTask,
    GenerationConfig,
    LLMModel,
    ResolvedGenerationConfig
} from '@/lib/types'
import {
    applyModelCapabilities,
    resolveGenerationConfig
} from '@/features/benchmark/config'
import {
    experimentVariantSchema,
    generationConfigPatchSchema,
    generationConfigSchema,
    testSetSchema
} from '@/lib/validation'
import { captureModelSnapshot } from '@/features/benchmark/snapshots'
import { parseDecisionPrompt } from '@/features/decisions/domain'

export const MAX_EXPERIMENT_TASKS = 50000

/** Freeze inputs, resolved model×variant parameters and the full task plan
 * in case → variant → repeat → model order; reject invalid drafts. */
export async function planExperiment(
    draft: ExperimentDraft,
    models: LLMModel[],
    globalConfig: GenerationConfig,
    now: number
): Promise<ExperimentRun> {
    // Copy every mutable input before endpoint fingerprinting yields control.
    draft = structuredClone(draft)
    models = structuredClone(models)
    globalConfig = generationConfigSchema.parse(structuredClone(globalConfig))
    draft.testSet = testSetSchema.parse(draft.testSet)
    draft.overrides = generationConfigPatchSchema
        .strict()
        .parse(draft.overrides)
    draft.variants = draft.variants.map((variant) =>
        experimentVariantSchema.parse({
            ...variant,
            id: variant.id.trim(),
            overrides: generationConfigPatchSchema
                .strict()
                .parse(variant.overrides)
        })
    )
    if (
        new Set(draft.variants.map((variant) => variant.name)).size !==
        draft.variants.length
    )
        throw new Error('Parameter group names must be unique.')
    if (
        draft.repetitions !== Math.floor(draft.repetitions) ||
        draft.repetitions < 1 ||
        draft.repetitions > 20
    )
        throw new Error('Repetitions must be an integer between 1 and 20.')
    if (draft.variants.length < 1 || draft.variants.length > 8)
        throw new Error('Parameter groups must be between 1 and 8.')
    if (!draft.name.trim()) throw new Error('A name is required.')

    const uniqueModelIds = [...new Set(draft.modelIds)]
    if (uniqueModelIds.length === 0)
        throw new Error('Select at least one model.')
    const selectedModels = uniqueModelIds.map((id) => {
        const model = models.find((m) => m.id === id)
        if (!model || !model.enabled)
            throw new Error('All selected models must exist and be enabled.')
        return model
    })

    const cases = draft.testSet.cases.filter((c) => c.prompt.trim().length > 0)
    if (cases.length === 0)
        throw new Error('The test set needs at least one non-empty prompt.')
    if (selectedModels.some((model) => model.mode === 'decision')) {
        if (selectedModels.some((model) => model.mode !== 'decision'))
            throw new Error(
                'Set every selected model to Decision mode for a comparable task.'
            )
        for (const testCase of cases) parseDecisionPrompt(testCase.prompt)
    } else if (
        cases.some((testCase) => testCase.evaluation?.type === 'decision')
    ) {
        throw new Error('Decision test sets require models in Decision mode.')
    }
    const caseIds = new Set(draft.testSet.cases.map((c) => c.id))
    if (
        caseIds.size !== draft.testSet.cases.length ||
        draft.testSet.cases.some((c) => !c.id.trim())
    )
        throw new Error('Case IDs must be non-empty and unique.')
    const variantIds = new Set(draft.variants.map((v) => v.id))
    if (variantIds.size !== draft.variants.length)
        throw new Error('Parameter group IDs must be unique.')

    const totalTasks =
        cases.length *
        draft.variants.length *
        draft.repetitions *
        selectedModels.length
    if (totalTasks > MAX_EXPERIMENT_TASKS)
        throw new Error(
            `This plan needs ${totalTasks} tasks. Reduce models, groups, repetitions or cases (limit ${MAX_EXPERIMENT_TASKS}).`
        )

    const snapshots = await Promise.all(
        selectedModels.map((model) => captureModelSnapshot(model))
    )

    const configByModelVariant: Record<
        string,
        Record<string, ResolvedGenerationConfig>
    > = {}
    for (const model of selectedModels) {
        configByModelVariant[model.id] = {}
        for (const variant of draft.variants) {
            configByModelVariant[model.id][variant.id] = applyModelCapabilities(
                resolveGenerationConfig(
                    globalConfig,
                    model.config,
                    draft.overrides,
                    variant.overrides
                ),
                model.capabilities,
                model
            )
        }
    }

    const tasks: ExperimentTask[] = []
    for (const testCase of cases) {
        for (const variant of draft.variants) {
            for (
                let repeatIndex = 0;
                repeatIndex < draft.repetitions;
                repeatIndex++
            ) {
                for (const model of selectedModels) {
                    tasks.push({
                        id: crypto.randomUUID(),
                        caseId: testCase.id,
                        modelId: model.id,
                        variantId: variant.id,
                        repeatIndex,
                        attempts: []
                    })
                }
            }
        }
    }

    return {
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        testSet: structuredClone(draft.testSet),
        models: snapshots,
        variants: draft.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            overrides: structuredClone(variant.overrides)
        })),
        configByModelVariant,
        repetitions: draft.repetitions,
        maxConcurrent:
            Number.isFinite(globalConfig.maxConcurrent) &&
            globalConfig.maxConcurrent
                ? Math.max(
                      1,
                      Math.min(16, Math.floor(globalConfig.maxConcurrent))
                  )
                : 4,
        tasks,
        pendingTaskIds: tasks.map((task) => task.id),
        status: 'queued',
        createdAt: now
    }
}
