import type {
    ExperimentDraft,
    ExperimentRun,
    ExperimentTask,
    GenerationConfig,
    LLMModel,
    ResolvedGenerationConfig
} from '@/lib/types'
import { resolveGenerationConfig } from '@/features/benchmark/config'
import { captureModelSnapshot } from '@/features/benchmark/snapshots'

export const MAX_EXPERIMENT_TASKS = 50000

/**
 * Freezes a draft into a runnable experiment: copied test set, model
 * identities with fingerprints, resolved configs per model×variant and the
 * full task plan (case → variant → repeat → model). Throws with a
 * user-presentable message when the draft cannot produce a valid run.
 */
export async function planExperiment(
    draft: ExperimentDraft,
    models: LLMModel[],
    globalConfig: GenerationConfig,
    now: number
): Promise<ExperimentRun> {
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
    const caseIds = new Set(cases.map((c) => c.id))
    if (caseIds.size !== cases.length)
        throw new Error('Case IDs must be unique.')
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

    // Snapshots may reject unusable endpoints before anything is scheduled.
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
            configByModelVariant[model.id][variant.id] =
                resolveGenerationConfig(
                    globalConfig,
                    model.config,
                    draft.overrides,
                    variant.overrides
                )
        }
    }

    // Dispatch order: case → variant → repeat → model.
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
