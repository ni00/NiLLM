import { describe, expect, it } from 'vitest'
import { planExperiment } from './plan'
import type {
    ExperimentDraft,
    GenerationConfig,
    LLMModel,
    TestSet
} from '@/lib/types'

const globalConfig: GenerationConfig = {
    maxConcurrent: 2,
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9
}

function makeModel(id: string, overrides: Partial<LLMModel> = {}): LLMModel {
    return {
        id,
        name: id.toUpperCase(),
        provider: 'openai',
        providerId: id,
        enabled: true,
        ...overrides
    }
}

const testSet: TestSet = {
    id: 'ts',
    name: 'Two cases',
    cases: [
        { id: 'c1', prompt: 'Reply OK.', expected: 'OK' },
        { id: 'c2', prompt: 'Reply JSON.', expected: '{"n":1}' }
    ],
    createdAt: 1
}

function draft(
    overrides: Partial<ExperimentDraft> = {},
    models: LLMModel[] = [makeModel('a'), makeModel('b')]
): { draft: ExperimentDraft; models: LLMModel[] } {
    return {
        draft: {
            name: 'Smoke',
            testSet,
            modelIds: models.map((m) => m.id),
            repetitions: 3,
            overrides: {},
            variants: [{ id: 'default', name: 'Default', overrides: {} }],
            ...overrides
        },
        models
    }
}

describe('planExperiment', () => {
    it('plans tasks case → variant → repeat → model with frozen identities', async () => {
        const { draft: input, models } = draft()
        const run = await planExperiment(input, models, globalConfig, 123)
        expect(run.status).toBe('queued')
        expect(run.tasks).toHaveLength(12)
        expect(run.pendingTaskIds).toEqual(run.tasks.map((t) => t.id))
        expect(run.tasks[0]).toMatchObject({
            caseId: 'c1',
            variantId: 'default',
            repeatIndex: 0,
            modelId: 'a'
        })
        expect(run.tasks[1]).toMatchObject({ caseId: 'c1', modelId: 'b' })
        expect(run.tasks[2]).toMatchObject({ caseId: 'c1', repeatIndex: 1 })
        expect(run.maxConcurrent).toBe(2)
        expect(run.models.map((m) => m.mode)).toEqual(['chat', 'chat'])
        expect(run.testSet.cases[0].expected).toBe('OK')
        for (const model of run.models)
            for (const variant of run.variants)
                expect(
                    run.configByModelVariant[model.id][variant.id].requested
                        .temperature
                ).toBe(0.7)
    })

    it('rejects disabled models without creating a run', async () => {
        const disabled = makeModel('b', { enabled: false })
        const { draft: input } = draft({}, [makeModel('a'), disabled])
        await expect(
            planExperiment(input, [makeModel('a'), disabled], globalConfig, 1)
        ).rejects.toThrow(/exist and be enabled/)
    })

    it('rejects empty prompt sets', async () => {
        const empty: TestSet = {
            ...testSet,
            cases: [{ id: 'x', prompt: '   ' }]
        }
        const { draft: input, models } = draft({ testSet: empty }, [
            makeModel('a')
        ])
        await expect(
            planExperiment(input, models, globalConfig, 1)
        ).rejects.toThrow(/non-empty prompt/)
    })

    it('rejects out-of-range repetitions', async () => {
        const { draft: input, models } = draft({ repetitions: 21 }, [
            makeModel('a')
        ])
        await expect(
            planExperiment(input, models, globalConfig, 1)
        ).rejects.toThrow(/between 1 and 20/)
    })

    it('rejects duplicate variant ids', async () => {
        const { draft: input, models } = draft(
            {
                variants: [
                    { id: 'v', name: 'A', overrides: {} },
                    { id: 'v', name: 'B', overrides: {} }
                ]
            },
            [makeModel('a')]
        )
        await expect(
            planExperiment(input, models, globalConfig, 1)
        ).rejects.toThrow(/unique/)
    })

    it('refuses plans above the task ceiling', async () => {
        const bigCases = Array.from({ length: 400 }, (_, i) => ({
            id: `c${i}`,
            prompt: `p${i}`
        }))
        const variants = Array.from({ length: 8 }, (_, i) => ({
            id: `v${i}`,
            name: `V${i}`,
            overrides: {}
        }))
        const { draft: input, models } = draft(
            {
                testSet: { ...testSet, cases: bigCases },
                repetitions: 20,
                variants
            },
            [makeModel('a'), makeModel('b')]
        )
        // 400 × 8 × 20 × 2 = 128,000 > 50,000
        await expect(
            planExperiment(input, models, globalConfig, 1)
        ).rejects.toThrow(/Reduce/)
    })

    it('fails fast when a model endpoint is unusable', async () => {
        const bad = makeModel('bad', { provider: 'custom', baseURL: '   ' })
        const { draft: input } = draft({ modelIds: ['bad'] }, [bad])
        await expect(
            planExperiment(input, [bad], globalConfig, 1)
        ).rejects.toThrow(/base URL/i)
    })

    it('freezes resolved overrides with model → experiment → variant precedence', async () => {
        const model = makeModel('a', { config: { maxTokens: 128 } })
        const { draft: input } = draft(
            {
                overrides: { temperature: 0.2 },
                variants: [
                    { id: 'default', name: 'Default', overrides: {} },
                    { id: 'cold', name: 'Cold', overrides: { temperature: 0 } }
                ]
            },
            [model]
        )
        const run = await planExperiment(input, [model], globalConfig, 1)
        const base = run.configByModelVariant.a.default
        expect(base.requested.temperature).toBe(0.2)
        expect(base.requested.maxTokens).toBe(128)
        expect(base.effective.maxConcurrent).toBeUndefined()
        expect(run.configByModelVariant.a.cold.requested.temperature).toBe(0)
    })
})
