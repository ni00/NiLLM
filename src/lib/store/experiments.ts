import type { AppState } from './index'
import { StateCreator } from 'zustand'
import type {
    BenchmarkResult,
    ExperimentDraft,
    ExperimentRun
} from '@/lib/types'
import { planExperiment } from '@/features/experiments/domain/plan'
import { cancelExperimentExecution } from '@/features/experiments/runtime'

export const INTERRUPTED_ERROR = 'Experiment execution was interrupted.'
export const CLOSED_ERROR = 'Application closed before the request finished.'

export interface ExperimentsSlice {
    experimentRuns: ExperimentRun[]
    createExperiment: (draft: ExperimentDraft) => Promise<string>
    pauseExperiment: (id: string) => void
    resumeExperiment: (id: string) => void
    cancelExperiment: (id: string) => Promise<void>
    retryFailedExperiment: (id: string) => void
    deleteExperiment: (id: string) => Promise<void>
    /** Marks the run running; keeps the first real dispatch time. */
    beginExperiment: (id: string, now: number) => void
    /** Appends the initial attempt and drops the pending ID in one mutation. */
    appendExperimentAttempt: (
        runId: string,
        taskId: string,
        result: BenchmarkResult
    ) => boolean
    updateExperimentResult: (
        runId: string,
        taskId: string,
        resultId: string,
        updates: Partial<BenchmarkResult>
    ) => void
    /** Terminal bookkeeping once the runner stops claiming tasks. */
    settleExperiment: (runId: string, now: number) => void
    /** Marks an aborted run interrupted and recovers in-flight attempts. */
    interruptExperiment: (runId: string) => void
}

function mapRun(
    state: AppState,
    runId: string,
    update: (run: ExperimentRun) => ExperimentRun
): ExperimentRun[] {
    return state.experimentRuns.map((run) =>
        run.id === runId ? update(run) : run
    )
}

export const createExperimentsSlice: StateCreator<
    AppState,
    [],
    [],
    ExperimentsSlice
> = (set, get) => ({
    experimentRuns: [],

    createExperiment: async (draft) => {
        const state = get()
        const run = await planExperiment(
            draft,
            state.models,
            state.globalConfig,
            Date.now()
        )
        set((current) => ({ experimentRuns: [...current.experimentRuns, run] }))
        return run.id
    },

    pauseExperiment: (id) =>
        set((state) => ({
            experimentRuns: mapRun(state, id, (run) =>
                run.status === 'running'
                    ? { ...run, status: 'paused', error: undefined }
                    : run
            )
        })),

    resumeExperiment: (id) =>
        set((state) => ({
            experimentRuns: mapRun(state, id, (run) =>
                run.status === 'paused' || run.status === 'interrupted'
                    ? { ...run, status: 'queued', error: undefined }
                    : run
            )
        })),

    cancelExperiment: async (id) => {
        set((state) => ({
            experimentRuns: mapRun(state, id, (run) => ({
                ...run,
                status: 'cancelled',
                pendingTaskIds: [],
                finishedAt: run.finishedAt ?? Date.now()
            }))
        }))
        await cancelExperimentExecution(id)
    },

    retryFailedExperiment: (id) =>
        set((state) => ({
            experimentRuns: mapRun(state, id, (run) => {
                if (run.status === 'running' || run.status === 'queued')
                    return run
                const retryIds = run.tasks
                    .filter(
                        (task) =>
                            task.attempts.length > 0 &&
                            task.attempts[task.attempts.length - 1].status ===
                                'error'
                    )
                    .map((task) => task.id)
                return {
                    ...run,
                    status: 'queued',
                    pendingTaskIds: retryIds,
                    error: undefined
                }
            })
        })),

    deleteExperiment: async (id) => {
        await cancelExperimentExecution(id)
        set((state) => ({
            experimentRuns: state.experimentRuns.filter((run) => run.id !== id)
        }))
    },

    beginExperiment: (id, now) =>
        set((state) => ({
            experimentRuns: mapRun(state, id, (run) => ({
                ...run,
                status: 'running',
                startedAt: run.startedAt ?? now,
                error: undefined
            }))
        })),

    appendExperimentAttempt: (runId, taskId, result) => {
        let appended = false
        set((state) => {
            const run = state.experimentRuns.find((r) => r.id === runId)
            const task = run?.tasks.find((t) => t.id === taskId)
            if (!run || !task || !run.pendingTaskIds.includes(taskId))
                return state
            appended = true
            return {
                experimentRuns: mapRun(state, runId, (current) => ({
                    ...current,
                    pendingTaskIds: current.pendingTaskIds.filter(
                        (pending) => pending !== taskId
                    ),
                    tasks: current.tasks.map((candidate) =>
                        candidate.id === taskId
                            ? {
                                  ...candidate,
                                  attempts: [...candidate.attempts, result]
                              }
                            : candidate
                    )
                }))
            }
        })
        return appended
    },

    updateExperimentResult: (runId, taskId, resultId, updates) =>
        set((state) => {
            const run = state.experimentRuns.find((r) => r.id === runId)
            const task = run?.tasks.find((t) => t.id === taskId)
            if (!task || !task.attempts.some((a) => a.id === resultId))
                return state
            return {
                experimentRuns: mapRun(state, runId, (current) => ({
                    ...current,
                    tasks: current.tasks.map((candidate) =>
                        candidate.id === taskId
                            ? {
                                  ...candidate,
                                  attempts: candidate.attempts.map((attempt) =>
                                      attempt.id === resultId
                                          ? { ...attempt, ...updates }
                                          : attempt
                                  )
                              }
                            : candidate
                    )
                }))
            }
        }),

    settleExperiment: (runId, now) =>
        set((state) => ({
            experimentRuns: mapRun(state, runId, (run) => {
                if (run.status !== 'running') return run
                if (run.pendingTaskIds.length > 0) return run
                return { ...run, status: 'completed', finishedAt: now }
            })
        })),

    interruptExperiment: (runId) =>
        set((state) => ({
            experimentRuns: mapRun(state, runId, (run) => {
                if (run.status !== 'running') return run
                const recovered: string[] = []
                const tasks = run.tasks.map((task) => {
                    const last = task.attempts[task.attempts.length - 1]
                    if (!last || last.status !== 'pending') return task
                    recovered.push(task.id)
                    return {
                        ...task,
                        attempts: task.attempts.map((attempt, index) =>
                            index === task.attempts.length - 1
                                ? {
                                      ...attempt,
                                      status: 'cancelled' as const,
                                      error: INTERRUPTED_ERROR
                                  }
                                : attempt
                        )
                    }
                })
                const pending = new Set(run.pendingTaskIds)
                for (const id of recovered) pending.add(id)
                const order = tasks.map((task) => task.id)
                return {
                    ...run,
                    status: 'interrupted',
                    error: INTERRUPTED_ERROR,
                    tasks,
                    pendingTaskIds: order.filter((id) => pending.has(id))
                }
            })
        }))
})
