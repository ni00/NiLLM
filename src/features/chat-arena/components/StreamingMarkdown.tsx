import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from 'lucide-react'

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

        // Context Menu State
        const [menuOpen, setMenuOpen] = useState(false)
        const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
        const [copied, setCopied] = useState(false)

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

        // Close menu on click outside
        useEffect(() => {
            const closeMenu = () => {
                if (menuOpen) setMenuOpen(false)
            }
            window.addEventListener('click', closeMenu)
            return () => window.removeEventListener('click', closeMenu)
        }, [menuOpen])

        const handleContextMenu = (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation() // Prevent bubbling
            setMenuPosition({ x: e.clientX, y: e.clientY })
            setMenuOpen(true)
            setCopied(false)
        }

        const handleCopy = (e: React.MouseEvent) => {
            e.stopPropagation()
            const selection = window.getSelection()?.toString()
            const textToCopy = selection || content
            navigator.clipboard.writeText(textToCopy)
            setCopied(true)
            setTimeout(() => setMenuOpen(false), 800)
        }

        return (
            <div
                className="markdown-body text-sm leading-relaxed px-1"
                onContextMenu={handleContextMenu}
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

                {menuOpen &&
                    createPortal(
                        <div
                            className="fixed z-50 min-w-[120px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                            style={{
                                top: Math.min(
                                    menuPosition.y,
                                    window.innerHeight - 50
                                ), // Simple bounds check (bottom)
                                left: Math.min(
                                    menuPosition.x,
                                    window.innerWidth - 120
                                ) // Simple bounds check (right)
                            }}
                        >
                            <button
                                onClick={handleCopy}
                                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                                {copied ? (
                                    <Check className="mr-2 h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="mr-2 h-4 w-4" />
                                )}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>,
                        document.body
                    )}
            </div>
        )
    }
)

StreamingMarkdown.displayName = 'StreamingMarkdown'
