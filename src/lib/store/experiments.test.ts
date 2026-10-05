import { createStore } from 'zustand/vanilla'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppState, storeHydration } from './index'
import { planExperiment } from '@/features/experiments/domain/plan'
import { registerExperimentJudging } from '@/features/experiments/runtime'
import { model, result } from '@/test/fixtures'
import type { BenchmarkResult } from '@/lib/types'

afterEach(() => vi.restoreAllMocks())

async function workspace(status: BenchmarkResult['status'] = 'completed') {
    await storeHydration
    const store = createStore(createAppState)
    const run = await planExperiment(
        {
            name: 'Ratings',
            modelIds: ['a'],
            repetitions: 1,
            overrides: {},
            variants: [{ id: 'default', name: 'Default', overrides: {} }],
            testSet: {
                id: 'tests',
                name: 'Tests',
                createdAt: 1,
                cases: [{ id: 'c', prompt: 'Question' }]
            }
        },
        [model()],
        store.getState().globalConfig,
        1
    )
    const task = run.tasks[0]
    task.attempts = [
        result('answer', {
            status,
            rating: 3,
            ratingSource: 'ai',
            experiment: { runId: run.id, taskId: task.id, attempt: 1 }
        })
    ]
    run.pendingTaskIds = []
    run.status = 'completed'
    store.setState({ experimentRuns: [run] })
    return { store, run, task }
}

describe('experiment human ratings', () => {
    it('records a completed answer rating, human source and the actual rating time', async () => {
        const { store, run, task } = await workspace()
        vi.spyOn(Date, 'now').mockReturnValue(12345)
        store.getState().rateExperimentResult(run.id, task.id, 'answer', 5)
        expect(
            store.getState().experimentRuns[0].tasks[0].attempts[0]
        ).toMatchObject({
            rating: 5,
            ratingSource: 'human',
            ratedAt: 12345,
            status: 'completed'
        })
    })

    it.each([0, 6, 2.5])(
        'rejects ratings outside the integer 1–5 range',
        async (rating) => {
            const { store, run, task } = await workspace()
            const original = store.getState().experimentRuns
            store
                .getState()
                .rateExperimentResult(run.id, task.id, 'answer', rating)
            expect(store.getState().experimentRuns).toBe(original)
        }
    )

    it.each(['pending', 'error', 'cancelled'] as const)(
        'does not rate a %s attempt',
        async (status) => {
            const { store, run, task } = await workspace(status)
            const original = store.getState().experimentRuns
            store.getState().rateExperimentResult(run.id, task.id, 'answer', 5)
            expect(store.getState().experimentRuns).toBe(original)
        }
    )

    it('waits for grading to settle before deleting and ignores late result writes', async () => {
        const { store, run, task } = await workspace()
        const controller = new AbortController()
        let settle!: () => void
        const settled = new Promise<void>((resolve) => {
            settle = resolve
        })
        const unregister = registerExperimentJudging(
            run.id,
            controller,
            settled
        )
        try {
            const deleting = store.getState().deleteExperiment(run.id)
            expect(controller.signal.aborted).toBe(true)
            expect(store.getState().experimentRuns[0]).toBe(run)
            settle()
            await deleting
            store.getState().updateExperimentResult(run.id, task.id, 'answer', {
                rating: 5
            })
            expect(store.getState().experimentRuns).toEqual([])
        } finally {
            settle()
            unregister()
        }
    })
})
