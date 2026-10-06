import type {
    StreamRequest,
    GenerationWorkerEvent
} from '@/lib/streaming/protocol'
import { needsNativeTransport } from '@/lib/providers/transport'

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

// The worker entry is emitted as a chunk of the main build so the two graphs
// share the provider SDK instead of bundling a second copy of it. Only the URL
// differs between the dev server and the built assets.
const streamWorkerUrl = import.meta.env.DEV
    ? new URL(
          /* @vite-ignore */ '../../lib/workers/stream.worker.ts',
          import.meta.url
      )
    : new URL(/* @vite-ignore */ './stream-worker.js', import.meta.url)

export class GenerationWorkerPool {
    private slots = new Set<Slot>()
    private nativeJobs = new Map<AbortController, Job>()
    constructor(
        private createWorker = () =>
            new Worker(streamWorkerUrl, { type: 'module' }),
        private idleMs = 30000
    ) {}
    dispatch(request: StreamRequest, job: Job): WorkerLease {
        // Tauri IPC is available in the WebView, not in Web Workers. Keep
        // these asynchronous streams here so discovery and generation use
        // the same native transport. The scheduler still bounds concurrency.
        if (needsNativeTransport(request.model)) {
            const controller = new AbortController()
            const requestId = crypto.randomUUID()
            this.nativeJobs.set(controller, job)
            void import('@/lib/workers/generate')
                .then(async ({ executeGeneration }) => {
                    controller.signal.throwIfAborted()
                    await executeGeneration(
                        request,
                        (event) => {
                            if (this.nativeJobs.has(controller))
                                job.onEvent({ ...event, requestId })
                        },
                        controller
                    )
                })
                .catch(() => {
                    if (this.nativeJobs.has(controller)) job.onError()
                })
                .finally(() => this.nativeJobs.delete(controller))
            return {
                release: (cancel = false) => {
                    this.nativeJobs.delete(controller)
                    if (cancel) controller.abort()
                }
            }
        }
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
        const nativeJobs = [...this.nativeJobs]
        this.nativeJobs.clear()
        for (const [controller, job] of nativeJobs) {
            controller.abort()
            job.onError()
        }
        for (const slot of this.slots) this.retire(slot)
    }
}
export const generationWorkers = new GenerationWorkerPool()
