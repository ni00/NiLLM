// Keep cancellation registries independent of the store and runner.

export interface ExperimentExecution {
    controller: AbortController
    settled: Promise<void>
}

const executions = new Map<string, ExperimentExecution>()

// Track judging separately so deletion can await both batches.

const judgings = new Map<string, ExperimentExecution>()

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

/** Register one judging batch and return its unregister callback. */
export function registerExperimentJudging(
    runId: string,
    controller: AbortController,
    settled: Promise<void>
): () => void {
    judgings.set(runId, { controller, settled })
    return () => {
        if (judgings.get(runId)?.settled === settled) judgings.delete(runId)
    }
}

/** Abort requests and wait for the runner; resolve immediately when inactive. */
export async function cancelExperimentExecution(runId: string): Promise<void> {
    const execution = executions.get(runId)
    if (!execution) return
    execution.controller.abort()
    await execution.settled
}

/** Abort judging and wait for the batch; resolve immediately when inactive. */
export async function cancelExperimentJudging(runId: string): Promise<void> {
    const judging = judgings.get(runId)
    if (!judging) return
    judging.controller.abort()
    await judging.settled
}
