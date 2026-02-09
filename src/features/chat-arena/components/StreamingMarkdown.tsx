import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface StreamingMarkdownProps {
    content: string
    isStreaming?: boolean
}

/**
 * Optimized Markdown renderer for streaming content.
 * Uses requestAnimationFrame-based throttling to ensure smooth rendering
 * without overwhelming the CPU during high-frequency token updates.
 */
export const StreamingMarkdown = React.memo(
    ({ content, isStreaming }: StreamingMarkdownProps) => {
        const [displayContent, setDisplayContent] = useState(content)
        const contentRef = useRef(content)
        const frameId = useRef<number | null>(null)
        const lastUpdate = useRef<number>(0)

        // Update ref whenever content changes
        useEffect(() => {
            contentRef.current = content
        }, [content])

        useEffect(() => {
            if (!isStreaming) {
                // If not streaming, sync immediately and cancel any pending frames
                setDisplayContent(content)
                if (frameId.current !== null) {
                    cancelAnimationFrame(frameId.current)
                    frameId.current = null
                }
                return
            }

            // Throttled update loop
            const updateLoop = (now: number) => {
                // Target ~10-15fps for markdown parsing during streaming is plenty
                // and saves massive CPU cycles. (approx every 66-100ms)
                if (now - lastUpdate.current > 80) {
                    if (displayContent !== contentRef.current) {
                        setDisplayContent(contentRef.current)
                        lastUpdate.current = now
                    }
                }
                frameId.current = requestAnimationFrame(updateLoop)
            }

            frameId.current = requestAnimationFrame(updateLoop)

            return () => {
                if (frameId.current !== null) {
                    cancelAnimationFrame(frameId.current)
                }
            }
        }, [isStreaming]) // Only restart loop when isStreaming state changes

        return (
            <div
                className="markdown-body text-sm leading-relaxed px-1"
                style={{
                    // Optimization: Tell the browser this content will change frequently
                    willChange: isStreaming ? 'contents' : 'auto',
                    // Optimization: Contain the layout and paint to this container
                    contain: 'layout style paint',
                    // Ensure the container has its own layer
                    transform: 'translateZ(0)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere'
                }}
            >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {displayContent}
                </ReactMarkdown>
            </div>
        )
    }
)

StreamingMarkdown.displayName = 'StreamingMarkdown'
