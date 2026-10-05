import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runWorkerStream } from './worker-stream'
import { generationWorkers } from './worker-pool'
import { model } from '@/test/fixtures'
import type {
    GenerationWorkerEvent,
    StreamEvent
} from '@/lib/streaming/protocol'

class MockWorker {
    static instances: MockWorker[] = []
    onmessage?: (event: MessageEvent<GenerationWorkerEvent>) => void
    onerror?: () => void
    terminate = vi.fn()
    postMessage = vi.fn()
    constructor() {
        MockWorker.instances.push(this)
    }
    send(event: StreamEvent, requestId = this.requestId) {
        this.onmessage?.({
            data: { ...event, requestId }
        } as MessageEvent<GenerationWorkerEvent>)
    }
    get requestId(): string {
        return this.postMessage.mock.calls.findLast(
            ([message]) => message.type === 'generate'
        )![0].requestId
    }
}
beforeEach(() => {
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
})
afterEach(() => {
    generationWorkers.dispose()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})
describe('worker lifecycle', () => {
    it('allows non-streaming decisions to use the full request timeout and cancel normally', async () => {
        vi.useFakeTimers()
        try {
            const controller = new AbortController()
            const task = runWorkerStream({
                model: model('jev', {
                    provider: 'typesafe',
                    mode: 'decision',
                    config: {
                        connectTimeout: 100,
                        readTimeout: 100,
                        timeout: { totalMs: 60000 }
                    }
                }),
                messages: [],
                resultId: 'r',
                onUpdate: vi.fn(),
                signal: controller.signal
            })
            await vi.advanceTimersByTimeAsync(30000)
            expect(MockWorker.instances[0].terminate).not.toHaveBeenCalled()
            controller.abort()
            expect(await task).toMatchObject({ status: 'cancelled' })
            expect(
                MockWorker.instances[0].postMessage
            ).toHaveBeenLastCalledWith({
                type: 'cancel',
                requestId: MockWorker.instances[0].requestId
            })
        } finally {
            vi.useRealTimers()
        }
    })
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
        expect(MockWorker.instances[0].postMessage).toHaveBeenLastCalledWith({
            type: 'cancel',
            requestId: MockWorker.instances[0].requestId
        })
        expect(MockWorker.instances[0].terminate).not.toHaveBeenCalled()
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
        expect(worker.terminate).not.toHaveBeenCalled()
    })
    it('times out connection attempts and cancels only that request', async () => {
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
        expect(MockWorker.instances[0].postMessage).toHaveBeenLastCalledWith({
            type: 'cancel',
            requestId: MockWorker.instances[0].requestId
        })
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
    it('reuses workers while isolating cancellation and delayed retry events', async () => {
        const controller = new AbortController()
        const cancelled = runWorkerStream({
            model: model(),
            messages: [],
            resultId: 'r',
            onUpdate: vi.fn(),
            signal: controller.signal
        })
        const worker = MockWorker.instances[0]
        const oldId = worker.requestId
        const sibling = runWorkerStream({
            model: model(),
            messages: [],
            resultId: 's',
            onUpdate: vi.fn()
        })
        const siblingId = worker.requestId
        controller.abort()
        expect((await cancelled).status).toBe('cancelled')
        const retry = runWorkerStream({
            model: model(),
            messages: [],
            resultId: 'r',
            onUpdate: vi.fn()
        })
        const retryId = worker.requestId
        worker.send(
            { type: 'error', resultId: 'r', error: 'Old failure' },
            oldId
        )
        worker.send(
            {
                type: 'update',
                resultId: 's',
                textDelta: 'Sibling',
                isFinal: true,
                metrics: { ttft: 1, tps: 1, totalDuration: 1, tokenCount: 1 }
            },
            siblingId
        )
        worker.send(
            {
                type: 'update',
                resultId: 'r',
                textDelta: 'Retry',
                isFinal: true,
                metrics: { ttft: 1, tps: 1, totalDuration: 1, tokenCount: 1 }
            },
            retryId
        )
        expect(await sibling).toMatchObject({
            status: 'completed',
            response: 'Sibling'
        })
        expect(await retry).toMatchObject({
            status: 'completed',
            response: 'Retry'
        })
        expect(MockWorker.instances).toHaveLength(1)
    })
    it('reclaims idle workers without terminating other active jobs', async () => {
        vi.useFakeTimers()
        const options = {
            model: model('a', { config: { connectTimeout: 120000 } }),
            messages: [],
            onUpdate: vi.fn()
        }
        const first = runWorkerStream({ ...options, resultId: 'first' })
        const worker = MockWorker.instances[0]
        const firstId = worker.requestId
        const second = runWorkerStream({ ...options, resultId: 'second' })
        worker.send({ type: 'done', resultId: 'first' }, firstId)
        await first
        await vi.advanceTimersByTimeAsync(30000)
        expect(worker.terminate).not.toHaveBeenCalled()
        worker.send({ type: 'done', resultId: 'second' })
        await second
        await vi.advanceTimersByTimeAsync(29999)
        expect(worker.terminate).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(worker.terminate).toHaveBeenCalledOnce()
        const third = runWorkerStream({ ...options, resultId: 'third' })
        expect(MockWorker.instances).toHaveLength(2)
        MockWorker.instances[1].send({ type: 'done', resultId: 'third' })
        await third
    })
    it('settles every affected request on a worker crash and recreates it', async () => {
        const options = { model: model(), messages: [], onUpdate: vi.fn() }
        const first = runWorkerStream({ ...options, resultId: 'first' })
        const second = runWorkerStream({ ...options, resultId: 'second' })
        MockWorker.instances[0].onerror?.()
        expect(await first).toMatchObject({
            status: 'error',
            error: 'Generation worker failed.'
        })
        expect(await second).toMatchObject({
            status: 'error',
            error: 'Generation worker failed.'
        })
        const next = runWorkerStream({ ...options, resultId: 'next' })
        expect(MockWorker.instances).toHaveLength(2)
        MockWorker.instances[1].send({ type: 'done', resultId: 'next' })
        expect((await next).status).toBe('completed')
    })
    it('dispatches sixteen requests through two workers without reducing concurrency', async () => {
        const tasks = Array.from({ length: 16 }, (_, index) =>
            runWorkerStream({
                model: model(),
                messages: [],
                resultId: `r${index}`,
                onUpdate: vi.fn()
            })
        )
        expect(MockWorker.instances).toHaveLength(2)
        for (const worker of MockWorker.instances) {
            const requests = worker.postMessage.mock.calls.map(
                ([request]) => request
            )
            expect(requests).toHaveLength(8)
            for (const request of requests)
                worker.send(
                    { type: 'done', resultId: request.resultId },
                    request.requestId
                )
        }
        expect(
            (await Promise.all(tasks)).every(
                (outcome) => outcome.status === 'completed'
            )
        ).toBe(true)
    })
})
