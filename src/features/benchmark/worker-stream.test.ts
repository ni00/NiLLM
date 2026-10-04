import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runWorkerStream } from './worker-stream'
import { model } from '@/test/fixtures'
import type { StreamEvent } from '@/lib/streaming/protocol'

class MockWorker {
    static instances: MockWorker[] = []
    onmessage?: (event: MessageEvent<StreamEvent>) => void
    onerror?: () => void
    terminate = vi.fn()
    postMessage = vi.fn()
    constructor() {
        MockWorker.instances.push(this)
    }
    send(event: StreamEvent) {
        this.onmessage?.({ data: event } as MessageEvent<StreamEvent>)
    }
}
beforeEach(() => {
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
})
describe('worker lifecycle', () => {
    it('preserves partial text on cancellation', async () => {
        const onUpdate = vi.fn()
        const controller = new AbortController()
        const task = runWorkerStream({
            model: model(),
            messages: [],
            resultId: 'r',
            onUpdate,
            signal: controller.signal
        })
        MockWorker.instances[0].send({
            type: 'update',
            resultId: 'r',
            textDelta: 'partial',
            metrics: { ttft: 100, tps: 2, totalDuration: 500, tokenCount: 1 },
            isFinal: false
        })
        controller.abort()
        const outcome = await task
        expect(outcome).toMatchObject({
            status: 'cancelled',
            response: 'partial',
            error: 'Generation cancelled.'
        })
        expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce()
        expect(onUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ response: 'partial' })
        )
    })
    it('settles a final update exactly once and ignores delayed events', async () => {
        const task = runWorkerStream({
            model: model(),
            messages: [],
            resultId: 'r',
            onUpdate: vi.fn()
        })
        const worker = MockWorker.instances[0]
        worker.send({
            type: 'update',
            resultId: 'r',
            textDelta: 'Done',
            metrics: { ttft: 100, tps: 20, totalDuration: 500, tokenCount: 8 },
            isFinal: true
        })
        worker.send({ type: 'error', resultId: 'r', error: 'Late failure' })
        const outcome = await task
        expect(outcome).toMatchObject({
            status: 'completed',
            response: 'Done',
            error: undefined
        })
        expect(worker.terminate).toHaveBeenCalledOnce()
    })
    it('times out connection attempts and terminates the worker', async () => {
        vi.useFakeTimers()
        const task = runWorkerStream({
            model: model('a', { config: { connectTimeout: 100 } }),
            messages: [],
            resultId: 'r',
            onUpdate: vi.fn()
        })
        await vi.advanceTimersByTimeAsync(100)
        const outcome = await task
        expect(outcome.status).toBe('error')
        expect(outcome.error).toBe('Connection timed out after 0.1s.')
        expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce()
        vi.useRealTimers()
    })
    it('never spawns a worker for a pre-cancelled signal', async () => {
        const controller = new AbortController()
        controller.abort()
        const outcome = await runWorkerStream({
            model: model(),
            messages: [],
            resultId: 'r',
            onUpdate: vi.fn(),
            signal: controller.signal
        })
        expect(outcome.status).toBe('cancelled')
        expect(MockWorker.instances).toHaveLength(0)
    })
})
