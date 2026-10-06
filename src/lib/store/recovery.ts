import type { ChatSession, ExperimentRun } from '@/lib/types'

export const INTERRUPTED_ERROR = 'Experiment execution was interrupted.'
export const CLOSED_ERROR = 'Application closed before the request finished.'

/** Cancel every trailing pending attempt, returning the tasks and the pending
 * set rebuilt in plan order. Shared by in-session interruption and the
 * restart-time recovery path so both stay in step. */
export function closePendingAttempts(
    run: ExperimentRun,
    error: string
): Pick<ExperimentRun, 'tasks' | 'pendingTaskIds'> {
    const recovered = new Set<string>()
    const tasks = run.tasks.map((task) => {
        const last = task.attempts[task.attempts.length - 1]
        if (!last || last.status !== 'pending') return task
        recovered.add(task.id)
        return {
            ...task,
            attempts: task.attempts.map((attempt, index) =>
                index === task.attempts.length - 1
                    ? { ...attempt, status: 'cancelled' as const, error }
                    : attempt
            )
        }
    })
    const pending = new Set(run.pendingTaskIds)
    for (const id of recovered) pending.add(id)
    return {
        tasks,
        pendingTaskIds: tasks
            .map((task) => task.id)
            .filter((id) => pending.has(id))
    }
}

/** Interrupt queued/running runs, preserving paused status and partial output. */
export function recoverInterruptedExperiment(
    run: ExperimentRun
): ExperimentRun {
    const wasActive = run.status === 'queued' || run.status === 'running'
    return {
        ...run,
        ...closePendingAttempts(run, CLOSED_ERROR),
        status: wasActive ? 'interrupted' : run.status,
        error: wasActive ? CLOSED_ERROR : run.error
    }
}

/** Cancel pending arena results after shutdown; keep partial output without resending. */
export function recoverInterruptedSession(session: ChatSession): ChatSession {
    let changed = false
    const results: ChatSession['results'] = {}
    for (const [modelId, modelResults] of Object.entries(session.results)) {
        results[modelId] = modelResults.map((result) => {
            if (result.status !== 'pending') return result
            changed = true
            return { ...result, status: 'cancelled', error: CLOSED_ERROR }
        })
    }
    return changed ? { ...session, results } : session
}
