import type {
    StreamRequest,
    GenerationWorkerEvent
} from '@/lib/streaming/protocol'

interface Job {
    onEvent: (event: GenerationWorkerEvent) => void
    onError: () => void
}
interface Slot {
    worker: Worker
    jobs: Map<string, Job>
    idleTimer?: ReturnType<typeof setTimeout>
}
export interface WorkerLease {
    release: (cancel?: boolean) => void
}

// Network concurrency stays with the scheduler. Multiplex independent
// requests across at most four runtimes, then reclaim idle SDK/adapters.
const REQUESTS_PER_RUNTIME = 8
const MAX_RUNTIMES = 4

export class GenerationWorkerPool {
    private slots = new Set<Slot>()
    constructor(
        private createWorker = () =>
            new Worker(
                new URL('../../lib/workers/stream.worker.ts', import.meta.url),
                { type: 'module' }
            ),
        private idleMs = 30000
    ) {}
    dispatch(request: StreamRequest, job: Job): WorkerLease {
        let slot = [...this.slots].sort((a, b) => a.jobs.size - b.jobs.size)[0]
        if (
            !slot ||
            (slot.jobs.size >= REQUESTS_PER_RUNTIME &&
                this.slots.size < MAX_RUNTIMES)
        ) {
            const worker = this.createWorker()
            slot = { worker, jobs: new Map() }
            const owned = slot
            worker.onmessage = ({
                data
            }: MessageEvent<GenerationWorkerEvent>) =>
                owned.jobs.get(data.requestId)?.onEvent(data)
            worker.onerror = () => this.retire(owned)
            worker.onmessageerror = () => this.retire(owned)
            this.slots.add(slot)
        }
        clearTimeout(slot.idleTimer)
        slot.idleTimer = undefined
        const owned = slot
        const requestId = crypto.randomUUID()
        owned.jobs.set(requestId, job)
        try {
            owned.worker.postMessage({
                ...request,
                type: 'generate',
                requestId
            })
        } catch {
            this.retire(owned)
        }
        return {
            release: (cancel = false) => {
                if (!owned.jobs.delete(requestId)) return
                if (cancel) {
                    try {
                        owned.worker.postMessage({ type: 'cancel', requestId })
                    } catch {
                        this.retire(owned)
                        return
                    }
                }
                if (!owned.jobs.size)
                    owned.idleTimer = setTimeout(
                        () => this.retire(owned),
                        this.idleMs
                    )
            }
        }
    }
    private retire(slot: Slot) {
        if (!this.slots.delete(slot)) return
        clearTimeout(slot.idleTimer)
        const jobs = [...slot.jobs.values()]
        slot.jobs.clear()
        slot.worker.onmessage = null
        slot.worker.onerror = null
        slot.worker.onmessageerror = null
        slot.worker.terminate()
        for (const job of jobs) job.onError()
    }
    dispose() {
        for (const slot of this.slots) this.retire(slot)
    }
}
export const generationWorkers = new GenerationWorkerPool()
