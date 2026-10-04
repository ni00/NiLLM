import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runWorkerStream } from './worker-stream'
import { useAppStore, storeHydration } from '@/lib/store'
import { cancelAllStreams } from '@/lib/streaming/cancellation'
import { model, result, session } from '@/test/fixtures'
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
beforeEach(async () => {
    await storeHydration
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
    useAppStore.setState({
        sessions: [
            session({ a: [result('r', { status: 'pending', response: '' })] })
        ],
        streamingData: {}
    })
})
describe('worker lifecycle', () => {
    it('preserves partial text on cancellation and clears live state', async () => {
        const schedule = vi.fn()
        const task = runWorkerStream(model(), [], 'r', 's', schedule)
        MockWorker.instances[0].send({
            type: 'update',
            resultId: 'r',
            textDelta: 'partial',
            metrics: { ttft: 100, tps: 2, totalDuration: 500, tokenCount: 1 },
            isFinal: false
        })
        cancelAllStreams()
        await task
        expect(useAppStore.getState().sessions[0].results.a[0]).toMatchObject({
            status: 'cancelled',
            response: 'partial'
        })
        expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce()
        expect(schedule).toHaveBeenLastCalledWith('r', null)
    })
    it('settles a final update exactly once and ignores delayed events', async () => {
        const task = runWorkerStream(model(), [], 'r', 's', vi.fn())
        const worker = MockWorker.instances[0]
        worker.send({
            type: 'update',
            resultId: 'r',
            textDelta: 'Done',
            metrics: { ttft: 100, tps: 20, totalDuration: 500, tokenCount: 8 },
            isFinal: true
        })
        worker.send({ type: 'error', resultId: 'r', error: 'Late failure' })
        await task
        expect(useAppStore.getState().sessions[0].results.a[0]).toMatchObject({
            status: 'completed',
            response: 'Done',
            error: undefined
        })
        expect(worker.terminate).toHaveBeenCalledOnce()
    })
    it('times out connection attempts and records errors without leaving a worker alive', async () => {
        vi.useFakeTimers()
        const task = runWorkerStream(
            model('a', { config: { connectTimeout: 100 } }),
            [],
            'r',
            's',
            vi.fn()
        )
        await vi.advanceTimersByTimeAsync(100)
        await task
        expect(useAppStore.getState().sessions[0].results.a[0].status).toBe(
            'error'
        )
        expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce()
        vi.useRealTimers()
    })
})
