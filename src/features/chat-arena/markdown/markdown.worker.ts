import { parseMarkdown } from './parse'
import type { MarkdownRequest, MarkdownReply } from './protocol'

self.onmessage = ({ data }: MessageEvent<MarkdownRequest>) => {
    const reply: MarkdownReply = { id: data.id, revision: data.revision }
    try {
        reply.blocks = parseMarkdown(data.content)
    } catch {
        reply.failed = true
    }
    self.postMessage(reply)
}
