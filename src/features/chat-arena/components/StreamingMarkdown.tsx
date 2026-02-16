import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ContextMenu } from './ContextMenu'
import { ImageLightbox } from './ImageLightbox'
import { downloadImage } from '@/lib/utils/downloadImage'

interface StreamingMarkdownProps {
    content: string
    isStreaming?: boolean
}

export const StreamingMarkdown = React.memo(
    ({ content, isStreaming }: StreamingMarkdownProps) => {
        const [displayContent, setDisplayContent] = useState(content)
        const contentRef = useRef(content)
        const frameId = useRef<number | null>(null)
        const lastUpdate = useRef<number>(0)

        const [menuOpen, setMenuOpen] = useState(false)
        const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
        const [copied, setCopied] = useState(false)
        const [contextImageSrc, setContextImageSrc] = useState<string | null>(
            null
        )
        const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

        useEffect(() => {
            contentRef.current = content
        }, [content])

        useEffect(() => {
            if (!isStreaming) {
                setDisplayContent(content)
                if (frameId.current !== null) {
                    cancelAnimationFrame(frameId.current)
                    frameId.current = null
                }
                return
            }

            const updateLoop = (now: number) => {
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
        }, [isStreaming])

        useEffect(() => {
            const closeMenu = () => {
                if (menuOpen) setMenuOpen(false)
            }
            window.addEventListener('click', closeMenu)
            return () => window.removeEventListener('click', closeMenu)
        }, [menuOpen])

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

        const handleCopy = () => {
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
                    willChange: isStreaming ? 'contents' : 'auto',
                    contain: 'layout style paint',
                    transform: 'translateZ(0)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere'
                }}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={(url) => {
                        if (url.startsWith('data:image/')) return url
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

                <ContextMenu
                    isOpen={menuOpen}
                    position={menuPosition}
                    hasImage={!!contextImageSrc}
                    copied={copied}
                    onCopy={handleCopy}
                    onViewImage={() =>
                        contextImageSrc && setLightboxSrc(contextImageSrc)
                    }
                    onDownloadImage={() =>
                        contextImageSrc && downloadImage(contextImageSrc)
                    }
                    onClose={() => setMenuOpen(false)}
                />

                {lightboxSrc && (
                    <ImageLightbox
                        src={lightboxSrc}
                        onClose={() => setLightboxSrc(null)}
                        onDownload={downloadImage}
                    />
                )}

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
