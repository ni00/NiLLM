import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, Download, ZoomIn, X } from 'lucide-react'

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
        // Track if context menu was triggered on an image
        const [contextImageSrc, setContextImageSrc] = useState<string | null>(
            null
        )

        // Lightbox State
        const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

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

        // Close lightbox on Escape
        useEffect(() => {
            if (!lightboxSrc) return
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === 'Escape') setLightboxSrc(null)
            }
            window.addEventListener('keydown', handleKey)
            return () => window.removeEventListener('keydown', handleKey)
        }, [lightboxSrc])

        const handleContextMenu = (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()

            // Check if right-click was on an image
            const target = e.target as HTMLElement
            const imgSrc =
                target.tagName === 'IMG'
                    ? (target as HTMLImageElement).src
                    : null

            setContextImageSrc(imgSrc)
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

        const handleDownloadImage = useCallback(
            (e: React.MouseEvent) => {
                e.stopPropagation()
                if (!contextImageSrc) return

                // Create a temporary link to download the image
                const link = document.createElement('a')
                link.href = contextImageSrc

                // Determine file extension from data URL or default to png
                let ext = 'png'
                const mimeMatch = contextImageSrc.match(/^data:image\/(\w+);/)
                if (mimeMatch) {
                    ext = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1]
                }

                link.download = `generated-image-${Date.now()}.${ext}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                setMenuOpen(false)
            },
            [contextImageSrc]
        )

        // Calculate context menu bounds
        const menuHeight = contextImageSrc ? 90 : 40
        const menuWidth = 160

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
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={(url) => {
                        // Allow data: URLs for images (base64 image generation)
                        if (url.startsWith('data:image/')) return url
                        // Default behavior for other URLs
                        if (
                            url.startsWith('http://') ||
                            url.startsWith('https://')
                        )
                            return url
                        return url
                    }}
                    components={{
                        img: ({ src, alt, ...props }) => {
                            if (!src) return null
                            return (
                                <img
                                    src={src}
                                    alt={alt || 'Generated Image'}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setLightboxSrc(src)
                                    }}
                                    style={{
                                        maxWidth: '100%',
                                        borderRadius: '8px',
                                        marginTop: '8px',
                                        marginBottom: '8px',
                                        cursor: 'zoom-in',
                                        transition:
                                            'opacity 0.2s, transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        ;(
                                            e.target as HTMLElement
                                        ).style.opacity = '0.9'
                                    }}
                                    onMouseLeave={(e) => {
                                        ;(
                                            e.target as HTMLElement
                                        ).style.opacity = '1'
                                    }}
                                    loading="lazy"
                                    {...props}
                                />
                            )
                        }
                    }}
                >
                    {displayContent}
                </ReactMarkdown>

                {/* Context Menu */}
                {menuOpen &&
                    createPortal(
                        <div
                            className="fixed z-[100] min-w-[160px] overflow-hidden rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm p-1 text-popover-foreground shadow-xl"
                            style={{
                                top: Math.min(
                                    menuPosition.y,
                                    window.innerHeight - menuHeight
                                ),
                                left: Math.min(
                                    menuPosition.x,
                                    window.innerWidth - menuWidth
                                ),
                                animation: 'fadeInScale 0.15s ease-out'
                            }}
                        >
                            {/* Show image-specific options when right-clicking on an image */}
                            {contextImageSrc && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setLightboxSrc(contextImageSrc)
                                            setMenuOpen(false)
                                        }}
                                        className="relative flex w-full cursor-default select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <ZoomIn className="mr-2.5 h-4 w-4 opacity-60" />
                                        <span>View Full Size</span>
                                    </button>
                                    <button
                                        onClick={handleDownloadImage}
                                        className="relative flex w-full cursor-default select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <Download className="mr-2.5 h-4 w-4 opacity-60" />
                                        <span>Download Image</span>
                                    </button>
                                    <div className="my-1 h-px bg-border/50" />
                                </>
                            )}
                            <button
                                onClick={handleCopy}
                                className="relative flex w-full cursor-default select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                {copied ? (
                                    <Check className="mr-2.5 h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="mr-2.5 h-4 w-4 opacity-60" />
                                )}
                                <span>{copied ? 'Copied' : 'Copy Text'}</span>
                            </button>
                        </div>,
                        document.body
                    )}

                {/* Image Lightbox */}
                {lightboxSrc &&
                    createPortal(
                        <div
                            className="fixed inset-0 z-[200] flex items-center justify-center"
                            style={{
                                animation: 'fadeIn 0.2s ease-out'
                            }}
                            onClick={() => setLightboxSrc(null)}
                        >
                            {/* Backdrop */}
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                            {/* Close button */}
                            <button
                                onClick={() => setLightboxSrc(null)}
                                className="absolute top-4 right-4 z-10 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            {/* Download button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const link = document.createElement('a')
                                    link.href = lightboxSrc
                                    let ext = 'png'
                                    const mimeMatch =
                                        lightboxSrc.match(/^data:image\/(\w+);/)
                                    if (mimeMatch)
                                        ext =
                                            mimeMatch[1] === 'jpeg'
                                                ? 'jpg'
                                                : mimeMatch[1]
                                    link.download = `generated-image-${Date.now()}.${ext}`
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                }}
                                className="absolute top-4 right-16 z-10 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
                            >
                                <Download className="h-6 w-6" />
                            </button>

                            {/* Image */}
                            <img
                                src={lightboxSrc}
                                alt="Full size image"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'relative',
                                    maxWidth: '90vw',
                                    maxHeight: '90vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                                    animation: 'scaleIn 0.25s ease-out',
                                    cursor: 'default'
                                }}
                            />
                        </div>,
                        document.body
                    )}

                {/* Animation styles */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes fadeInScale {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes scaleIn {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>
        )
    }
)

StreamingMarkdown.displayName = 'StreamingMarkdown'
