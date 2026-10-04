import type { ChatSession, ExperimentRun } from '@/lib/types'
import { CLOSED_ERROR } from './experiments'

/**
 * Marks one unfinished attempt as cancelled by the shutdown and returns the
 * owning task ID, or undefined when the attempt list is already terminal.
 */
function closePendingAttempt(task: ExperimentRun['tasks'][number]): {
    task: ExperimentRun['tasks'][number]
    recovered: boolean
} {
    const last = task.attempts[task.attempts.length - 1]
    if (!last || last.status !== 'pending') return { task, recovered: false }
    return {
        task: {
            ...task,
            attempts: task.attempts.map((attempt, index) =>
                index === task.attempts.length - 1
                    ? {
                          ...attempt,
                          status: 'cancelled' as const,
                          error: CLOSED_ERROR
                      }
                    : attempt
            )
        },
        recovered: true
    }
}

/**
 * Hydration-time recovery: queued/running runs become interrupted; paused
 * runs stay paused. In-flight attempts are cancelled with partial output
 * kept, their tasks rejoin the persisted pending set (in task order) so a
 * later "continue" or saved retry intent is neither lost nor duplicated.
 */
export function recoverInterruptedExperiment(
    run: ExperimentRun
): ExperimentRun {
    const wasActive = run.status === 'queued' || run.status === 'running'
    const recovered = new Set<string>()
    const tasks = run.tasks.map((task) => {
        const entry = closePendingAttempt(task)
        if (entry.recovered) recovered.add(task.id)
        return entry.task
    })
    const pending = new Set(run.pendingTaskIds)
    for (const id of recovered) pending.add(id)
    return {
        ...run,
        status: wasActive ? 'interrupted' : run.status,
        error: wasActive ? CLOSED_ERROR : run.error,
        tasks,
        pendingTaskIds: tasks
            .map((task) => task.id)
            .filter((id) => pending.has(id))
    }
}

/**
 * Ordinary arena results stuck in `pending` across a shutdown become
 * cancelled with their partial output preserved; nothing is auto-resent.
 */
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
