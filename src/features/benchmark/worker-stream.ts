import type {
    BenchmarkMetrics,
    BenchmarkResult,
    LLMModel,
    Message
} from '@/lib/types'
import type { StreamEvent } from '@/lib/streaming/protocol'

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

/**
 * Pure executor around the generation worker: no store access, callers own
 * the initial result and the single durable write after the outcome settles.
 * Keeps the two-tier connect/read timeouts, sanitized error strings and
 * single-settle semantics; cancellation preserves partial output.
 */
export function runWorkerStream({
    model,
    messages,
    resultId,
    onUpdate,
    signal
}: RunWorkerStreamOptions): Promise<StreamOutcome> {
    const connectMs = model.config?.connectTimeout ?? 15000
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
        // Mutable cleanup registry: finish() may run before late
        // initializations, so every handle lives here instead of a TDZ-prone
        // const binding.
        const cleanup: {
            connectTimer?: ReturnType<typeof setTimeout>
            readTimer?: ReturnType<typeof setTimeout>
            unregisterSignal?: () => void
        } = {}
        let worker: Worker | undefined
        const finish = (
            status: StreamOutcome['status'],
            error?: string
        ): void => {
            if (settled) return
            settled = true
            clearTimeout(cleanup.connectTimer)
            clearTimeout(cleanup.readTimer)
            cleanup.unregisterSignal?.()
            worker?.terminate()
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
        try {
            worker = new Worker(
                new URL('../../lib/workers/stream.worker.ts', import.meta.url),
                { type: 'module' }
            )
        } catch {
            finish('error', 'Could not start generation worker.')
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
                    `Connection timed out after ${connectMs / 1000}s.`
                ),
            connectMs
        )
        worker.onmessage = ({ data }: MessageEvent<StreamEvent>) => {
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
        worker.onerror = () => finish('error', 'Generation worker failed.')
        worker.postMessage({ model, messages, resultId })
    })
}
