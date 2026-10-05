import { useEffect, useRef, useState } from 'react'
import {
    markdownRenderer,
    type MarkdownLease,
    type MarkdownSnapshot
} from './renderer'

export function useMarkdown(content: string, streaming = false) {
    const latest = useRef({ content, streaming })
    latest.current = { content, streaming }
    const lease = useRef<MarkdownLease | undefined>(undefined)
    const [snapshot, setSnapshot] = useState<MarkdownSnapshot>({
        blocks: [],
        failed: false
    })
    useEffect(() => {
        const current = markdownRenderer.open((next) =>
            setSnapshot((previous) =>
                previous.failed === next.failed &&
                previous.blocks.length === next.blocks.length &&
                previous.blocks.every(
                    (block, index) => block === next.blocks[index]
                )
                    ? previous
                    : next
            )
        )
        lease.current = current
        current.update(latest.current.content, latest.current.streaming)
        return () => {
            current.close()
            lease.current = undefined
        }
    }, [])
    useEffect(() => {
        lease.current?.update(content, streaming)
    }, [content, streaming])
    return snapshot
}
