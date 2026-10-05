import type {
    BenchmarkMetrics,
    BenchmarkResult,
    LLMModel,
    Message
} from '@/lib/types'
import type { StreamEvent } from '@/lib/streaming/protocol'
import { generationWorkers, type WorkerLease } from './worker-pool'

export interface StreamOutcome {
    response: string
    reasoning?: string
    metrics: BenchmarkMetrics
    status: 'completed' | 'error' | 'cancelled'
    error?: string
}

export interface RunWorkerStreamOptions {
    model: LLMModel
    messages: Message[]
    resultId: string
    /** Streaming progress for transient UI state; never a durable write. */
    onUpdate: (update: Partial<BenchmarkResult>) => void
    /** Pre-cancelled signals never spawn a worker. */
    signal?: AbortSignal
}

/** Execute through the worker pool without store writes. Preserve partial output
 * on cancellation and settle once, with separate connection/read timeouts. */
export function runWorkerStream({
    model,
    messages,
    resultId,
    onUpdate,
    signal
}: RunWorkerStreamOptions): Promise<StreamOutcome> {
    const isDecision =
        model.mode === 'decision' || model.provider === 'typesafe'
    const connectMs = isDecision
        ? (model.config?.timeout?.totalMs ?? 120000)
        : (model.config?.connectTimeout ?? 15000)
    const readMs = model.config?.readTimeout ?? 30000
    return new Promise<StreamOutcome>((resolve) => {
        let response = '',
            reasoning = '',
            settled = false
        let metrics: BenchmarkMetrics = {
            ttft: 0,
            tps: 0,
            totalDuration: 0,
            tokenCount: 0
        }
        // finish() can run before initialization completes.

        const cleanup: {
            connectTimer?: ReturnType<typeof setTimeout>
            readTimer?: ReturnType<typeof setTimeout>
            unregisterSignal?: () => void
        } = {}
        let lease: WorkerLease | undefined
        const finish = (
            status: StreamOutcome['status'],
            error?: string
        ): void => {
            if (settled) return
            settled = true
            clearTimeout(cleanup.connectTimer)
            clearTimeout(cleanup.readTimer)
            cleanup.unregisterSignal?.()
            lease?.release(status !== 'completed')
            resolve({
                response,
                reasoning: reasoning || undefined,
                metrics,
                status,
                error
            })
        }
        if (signal?.aborted) {
            finish('cancelled', 'Generation cancelled.')
            return
        }
        const onAbort = () => finish('cancelled', 'Generation cancelled.')
        signal?.addEventListener('abort', onAbort)
        cleanup.unregisterSignal = () =>
            signal?.removeEventListener('abort', onAbort)
        cleanup.connectTimer = setTimeout(
            () =>
                finish(
                    'error',
                    isDecision
                        ? `Decision request timed out after ${connectMs / 1000}s.`
                        : `Connection timed out after ${connectMs / 1000}s.`
                ),
            connectMs
        )
        const onEvent = (data: StreamEvent) => {
            if (settled || data.resultId !== resultId) return
            if (data.type === 'error') {
                finish('error', data.error)
                return
            }
            if (data.type === 'done') {
                finish('completed')
                return
            }
            clearTimeout(cleanup.connectTimer)
            clearTimeout(cleanup.readTimer)
            cleanup.readTimer = setTimeout(
                () =>
                    finish(
                        'error',
                        `Stream timed out after ${readMs / 1000}s without data.`
                    ),
                readMs
            )
            if (data.type === 'update') {
                response += data.textDelta
                reasoning += data.reasoningDelta || ''
                metrics = data.metrics
                if (data.isFinal) {
                    finish('completed')
                    return
                }
                onUpdate({
                    response,
                    reasoning: reasoning || undefined,
                    metrics
                })
            }
        }
        try {
            lease = generationWorkers.dispatch(
                { model, messages, resultId },
                {
                    onEvent,
                    onError: () => finish('error', 'Generation worker failed.')
                }
            )
            if (settled) lease.release(true)
            else if (signal?.aborted) onAbort()
        } catch {
            finish('error', 'Could not start generation worker.')
        }
    })
}
