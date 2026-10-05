import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MarkdownRenderer } from './renderer'
import type { MarkdownReply, MarkdownRequest } from './protocol'

class ParserWorker {
    onmessage: ((event: MessageEvent<MarkdownReply>) => void) | null = null
    onerror: (() => void) | null = null
    onmessageerror: (() => void) | null = null
    terminate = vi.fn()
    postMessage = vi.fn<(request: MarkdownRequest) => void>()
    reply(request = this.postMessage.mock.calls.at(-1)![0]) {
        this.onmessage?.({
            data: {
                id: request.id,
                revision: request.revision,
                blocks: [request.content]
            }
        } as MessageEvent<MarkdownReply>)
    }
}
let renderer: MarkdownRenderer
let workers: ParserWorker[]
beforeEach(() => {
    vi.useFakeTimers()
    workers = []
    renderer = new MarkdownRenderer(() => {
        const worker = new ParserWorker()
        workers.push(worker)
        return worker as unknown as Worker
    })
})
afterEach(() => {
    renderer.dispose()
    vi.useRealTimers()
})

it('bounds the queue to one latest prefix per model and serves all models fairly', () => {
    const listeners = Array.from({ length: 16 }, () => vi.fn())
    const leases = listeners.map((listener) => renderer.open(listener))
    leases.forEach((lease) => lease.update('prefix', true))
    const worker = workers[0]
    for (let chunk = 0; chunk < 100; chunk++) {
        leases.forEach((lease) =>
            lease.update('prefix' + 'x'.repeat(chunk + 1), true)
        )
    }
    vi.advanceTimersByTime(250)
    expect(workers).toHaveLength(1)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    leases.forEach((lease) =>
        lease.update('prefix' + 'x'.repeat(100) + ' final', false)
    )
    for (let index = 0; index < 17; index++) worker.reply()
    expect(worker.postMessage).toHaveBeenCalledTimes(17)
    for (const listener of listeners) {
        expect(listener).toHaveBeenLastCalledWith({
            blocks: ['prefix' + 'x'.repeat(100) + ' final'],
            failed: false
        })
    }
})

it('ignores a replaced answer and releases all work for unmounted documents', () => {
    const listener = vi.fn()
    const lease = renderer.open(listener)
    lease.update('Old answer', true)
    const worker = workers[0]
    lease.update('Replacement', false)
    worker.reply(worker.postMessage.mock.calls[0][0])
    expect(listener).not.toHaveBeenCalled()
    worker.reply()
    expect(listener).toHaveBeenCalledWith({
        blocks: ['Replacement'],
        failed: false
    })
    lease.update('Replacement extended', true)
    lease.close()
    vi.advanceTimersByTime(10000)
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(worker.postMessage).toHaveBeenCalledTimes(2)
})

it('reclaims idle parsing memory and recreates a runtime for the next answer', () => {
    const lease = renderer.open(vi.fn())
    lease.update('First', false)
    workers[0].reply()
    vi.advanceTimersByTime(100)
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    lease.update('Second', false)
    expect(workers).toHaveLength(2)
    workers[1].reply()
    lease.close()
    expect(workers[1].terminate).toHaveBeenCalledOnce()
})

it('falls back safely on a parser crash and permits later documents to recover', () => {
    const listener = vi.fn()
    renderer.open(listener).update('Content remains in the application', true)
    workers[0].onerror?.()
    expect(listener).toHaveBeenCalledWith({ blocks: [], failed: true })
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    const recovered = vi.fn()
    renderer.open(recovered).update('Next', false)
    workers[1].reply()
    expect(recovered).toHaveBeenCalledWith({ blocks: ['Next'], failed: false })
})
