// Execution registry decoupling the store from the runner: the slice cancels
// or deletes runs through this module without importing runner code, so no
// store ↔ runner import cycle exists. This module never imports the store.
export interface ExperimentExecution {
    controller: AbortController
    settled: Promise<void>
}

const executions = new Map<string, ExperimentExecution>()

export function registerExperimentExecution(
    runId: string,
    controller: AbortController,
    settled: Promise<void>
): () => void {
    executions.set(runId, { controller, settled })
    return () => {
        if (executions.get(runId)?.settled === settled) executions.delete(runId)
    }
}

/**
 * Aborts the run's in-flight requests and resolves once its runner settled.
 * A run without an active execution completes immediately.
 */
export async function cancelExperimentExecution(runId: string): Promise<void> {
    const execution = executions.get(runId)
    if (!execution) return
    execution.controller.abort()
    await execution.settled
}
