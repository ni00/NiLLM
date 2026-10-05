import type { MarkdownReply, MarkdownRequest } from './protocol'

export interface MarkdownSnapshot {
    blocks: string[]
    failed: boolean
}
export interface MarkdownLease {
    update: (content: string, streaming: boolean) => void
    close: () => void
}
interface Document {
    id: string
    revision: number
    content: string
    streaming: boolean
    lastDispatch: number
    timer?: ReturnType<typeof setTimeout>
    listener: (snapshot: MarkdownSnapshot) => void
}

/** One parser runtime, one in-flight parse and one latest update per document.
 * Backpressure prevents concurrent streams from queuing every full prefix. */
export class MarkdownRenderer {
    private documents = new Map<string, Document>()
    private pending = new Map<string, Document>()
    private worker?: Worker
    private busy?: MarkdownRequest
    private idleTimer?: ReturnType<typeof setTimeout>

    constructor(
        private createWorker = () =>
            new Worker(new URL('./markdown.worker.ts', import.meta.url), {
                type: 'module'
            }),
        private intervalMs = 250,
        private idleMs = 5000
    ) {}

    open(listener: Document['listener']): MarkdownLease {
        const doc: Document = {
            id: crypto.randomUUID(),
            revision: 0,
            content: '',
            streaming: true,
            lastDispatch: -Infinity,
            listener
        }
        this.documents.set(doc.id, doc)
        return {
            update: (content, streaming) => {
                if (!this.documents.has(doc.id)) return
                if (
                    doc.revision &&
                    content === doc.content &&
                    streaming === doc.streaming
                )
                    return
                doc.content = content
                doc.streaming = streaming
                doc.revision++
                clearTimeout(this.idleTimer)
                const remaining = streaming
                    ? doc.lastDispatch + this.intervalMs - Date.now()
                    : 0
                if (remaining <= 0) {
                    clearTimeout(doc.timer)
                    doc.timer = undefined
                    this.enqueue(doc)
                } else if (doc.timer === undefined) {
                    doc.timer = setTimeout(() => {
                        doc.timer = undefined
                        this.enqueue(doc)
                    }, remaining)
                }
            },
            close: () => {
                clearTimeout(doc.timer)
                this.documents.delete(doc.id)
                this.pending.delete(doc.id)
                if (!this.documents.size) this.stopWorker()
            }
        }
    }

    private enqueue(doc: Document) {
        if (!this.documents.has(doc.id)) return
        this.pending.set(doc.id, doc)
        this.pump()
    }

    private pump() {
        if (this.busy) return
        const doc = this.pending.values().next().value as Document | undefined
        if (!doc) {
            clearTimeout(this.idleTimer)
            const streaming = Array.from(this.documents.values()).some(
                (document) => document.streaming
            )
            this.idleTimer = setTimeout(
                () => this.stopWorker(),
                streaming ? this.idleMs : 100
            )
            return
        }
        this.pending.delete(doc.id)
        clearTimeout(this.idleTimer)
        this.idleTimer = undefined
        try {
            if (!this.worker) {
                this.worker = this.createWorker()
                this.worker.onmessage = ({
                    data
                }: MessageEvent<MarkdownReply>) => this.receive(data)
                this.worker.onerror = this.worker.onmessageerror = () =>
                    this.fail()
            }
            this.busy = {
                id: doc.id,
                revision: doc.revision,
                content: doc.content
            }
            doc.lastDispatch = Date.now()
            this.worker.postMessage(this.busy)
        } catch {
            this.fail()
        }
    }

    private receive(reply: MarkdownReply) {
        const request = this.busy
        if (
            !request ||
            reply.id !== request.id ||
            reply.revision !== request.revision
        )
            return
        this.busy = undefined
        const doc = this.documents.get(reply.id)
        // Display an older append-only prefix while the next parse is pending,
        // but never put an old answer back after a retry replaces the text.
        if (
            doc &&
            (doc.revision === reply.revision ||
                doc.content.startsWith(request.content))
        ) {
            doc.listener({
                blocks: reply.blocks ?? [],
                failed: reply.failed ?? false
            })
        }
        this.pump()
    }

    private fail() {
        this.stopWorker()
        this.pending.clear()
        for (const doc of this.documents.values()) {
            clearTimeout(doc.timer)
            doc.timer = undefined
            doc.listener({ blocks: [], failed: true })
        }
    }

    private stopWorker() {
        clearTimeout(this.idleTimer)
        this.idleTimer = undefined
        if (this.worker) {
            this.worker.onmessage = null
            this.worker.onerror = null
            this.worker.onmessageerror = null
            this.worker.terminate()
            this.worker = undefined
        }
        this.busy = undefined
    }

    dispose() {
        for (const doc of this.documents.values()) clearTimeout(doc.timer)
        this.documents.clear()
        this.pending.clear()
        this.stopWorker()
    }
}

export const markdownRenderer = new MarkdownRenderer()
