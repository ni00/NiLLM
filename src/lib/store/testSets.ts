import { StateCreator } from 'zustand'
import { TestSet } from '@/lib/types'

export interface TestSetsSlice {
    testSets: TestSet[]
    testSetOrder: string[]
    addTestSet: (testSet: TestSet) => void
    deleteTestSet: (id: string) => void
    setTestSets: (testSets: TestSet[]) => void
    updateTestSet: (id: string, updates: Partial<TestSet>) => void
    setTestSetOrder: (order: string[]) => void
}

export const createTestSetsSlice: StateCreator<
    TestSetsSlice,
    [],
    [],
    TestSetsSlice
> = (set) => ({
    testSets: [] as TestSet[],
    testSetOrder: [] as string[],

    addTestSet: (testSet) =>
        set((state) => ({
            testSets: [testSet, ...state.testSets],
            testSetOrder:
                state.testSetOrder.length > 0
                    ? [testSet.id, ...state.testSetOrder]
                    : []
        })),

    deleteTestSet: (id) =>
        set((state) => ({
            testSets: state.testSets.filter((ts) => ts.id !== id),
            testSetOrder: state.testSetOrder.filter((o) => o !== id)
        })),

    setTestSets: (testSets) => set({ testSets }),

    updateTestSet: (id, updates) =>
        set((state) => ({
            testSets: state.testSets.map((ts) =>
                ts.id === id ? { ...ts, ...updates } : ts
            )
        })),

    setTestSetOrder: (order) => set({ testSetOrder: order })
})
