import { useAppStore } from '@/lib/store'
import type {
    BenchmarkMetrics,
    BenchmarkResult,
    LLMModel,
    Message
} from '@/lib/types'
import type { StreamEvent } from '@/lib/streaming/protocol'
import { registerStreamCancellation } from '@/lib/streaming/cancellation'

export function runWorkerStream(
    model: LLMModel,
    messages: Message[],
    resultId: string,
    sessionId: string,
    schedule: (id: string, update: Partial<BenchmarkResult> | null) => void
) {
    const store = useAppStore.getState()
    const connectMs = model.config?.connectTimeout ?? 15000
    const readMs = model.config?.readTimeout ?? 30000
    return new Promise<void>((resolve) => {
        let worker: Worker
        try {
            worker = new Worker(
                new URL('../../lib/workers/stream.worker.ts', import.meta.url),
                { type: 'module' }
            )
        } catch {
            store.updateResult(sessionId, model.id, resultId, {
                status: 'error',
                error: 'Could not start generation worker.'
            })
            resolve()
            return
        }
        let response = '',
            reasoning = '',
            settled = false
        let metrics: BenchmarkMetrics = {
            ttft: 0,
            tps: 0,
            totalDuration: 0,
            tokenCount: 0
        }
        let readTimer: ReturnType<typeof setTimeout> | undefined
        const finish = (
            status: 'completed' | 'error' | 'cancelled',
            error?: string
        ) => {
            if (settled) return
            settled = true
            clearTimeout(connectTimer)
            clearTimeout(readTimer)
            worker.terminate()
            unregister()
            schedule(resultId, null)
            store.updateResult(sessionId, model.id, resultId, {
                response,
                reasoning: reasoning || undefined,
                metrics,
                status,
                error
            })
            store.clearStreamingData(resultId)
            resolve()
        }
        const unregister = registerStreamCancellation(() =>
            finish('cancelled', 'Generation cancelled.')
        )
        const connectTimer = setTimeout(
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
            clearTimeout(connectTimer)
            clearTimeout(readTimer)
            readTimer = setTimeout(
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
                schedule(resultId, {
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
