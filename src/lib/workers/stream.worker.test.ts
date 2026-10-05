import { afterEach, describe, expect, it, vi } from 'vitest'
import { model } from '@/test/fixtures'
import type { GenerationWorkerRequest } from '../streaming/protocol'

const { streamModel } = vi.hoisted(() => ({ streamModel: vi.fn() }))
vi.mock('../streaming/stream', () => ({ streamModel }))

afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    streamModel.mockReset()
})

describe('multiplexed worker requests', () => {
    it('cancels one fetch while keeping the other request and its event identity intact', async () => {
        const worker = { onmessage: null as unknown, postMessage: vi.fn() }
        vi.stubGlobal('self', worker)
        const pending = new Map<
            string,
            { signal: AbortSignal; complete: () => void }
        >()
        streamModel.mockImplementation(
            (_model, _messages, resultId, emit, signal) =>
                new Promise<void>((resolve, reject) => {
                    signal.addEventListener(
                        'abort',
                        () => reject(new DOMException('Aborted', 'AbortError')),
                        { once: true }
                    )
                    pending.set(resultId, {
                        signal,
                        complete: () => {
                            emit({
                                type: 'update',
                                resultId,
                                textDelta: 'Completed',
                                metrics: {
                                    ttft: 1,
                                    tps: 1,
                                    totalDuration: 1,
                                    tokenCount: 1
                                },
                                isFinal: true
                            })
                            resolve()
                        }
                    })
                })
        )
        await import('./stream.worker')
        const send = (data: GenerationWorkerRequest) =>
            (
                worker.onmessage as (event: {
                    data: GenerationWorkerRequest
                }) => Promise<void>
            )({ data })
        const first = send({
            type: 'generate',
            requestId: 'first-request',
            resultId: 'first',
            model: model(),
            messages: []
        })
        await vi.waitFor(() => expect(pending.has('first')).toBe(true))
        const second = send({
            type: 'generate',
            requestId: 'second-request',
            resultId: 'second',
            model: model(),
            messages: []
        })
        await vi.waitFor(() => expect(pending.size).toBe(2))
        await send({ type: 'cancel', requestId: 'first-request' })
        expect(pending.get('first')!.signal.aborted).toBe(true)
        expect(pending.get('second')!.signal.aborted).toBe(false)
        pending.get('second')!.complete()
        await Promise.all([first, second])
        expect(worker.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                requestId: 'first-request',
                resultId: 'first'
            })
        )
        expect(worker.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'done',
                requestId: 'second-request',
                resultId: 'second'
            })
        )
        expect(worker.postMessage).not.toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'done',
                requestId: 'first-request'
            })
        )
    })
    it('does not start a provider call when cancelled during module loading', async () => {
        const worker = { onmessage: null as unknown, postMessage: vi.fn() }
        vi.stubGlobal('self', worker)
        await import('./stream.worker')
        const send = (data: GenerationWorkerRequest) =>
            (
                worker.onmessage as (event: {
                    data: GenerationWorkerRequest
                }) => Promise<void>
            )({ data })
        const task = send({
            type: 'generate',
            requestId: 'early',
            resultId: 'r',
            model: model(),
            messages: []
        })
        await send({ type: 'cancel', requestId: 'early' })
        await task
        expect(streamModel).not.toHaveBeenCalled()
        expect(worker.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'error', requestId: 'early' })
        )
    })
})
