import React, { useEffect, useState, useMemo } from 'react'
import type { Components } from 'react-markdown'
import { useMarkdown } from '../markdown/useMarkdown'
import { MarkdownBlocks } from '../markdown/MarkdownBlocks'
import { ContextMenu } from './ContextMenu'
import { ImageLightbox } from './ImageLightbox'
import { downloadImage } from '@/lib/utils/downloadImage'

interface StreamingMarkdownProps {
    content: string
    isStreaming?: boolean
}

export const MarkdownContent = React.memo(
    ({ content, isStreaming }: StreamingMarkdownProps) => {
        const { blocks, failed } = useMarkdown(content, isStreaming)

        const [menuOpen, setMenuOpen] = useState(false)
        const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
        const [copied, setCopied] = useState(false)
        const [contextImageSrc, setContextImageSrc] = useState<string | null>(
            null
        )
        const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

        useEffect(() => {
            if (!menuOpen) return
            const closeMenu = () => setMenuOpen(false)
            window.addEventListener('click', closeMenu)
            return () => window.removeEventListener('click', closeMenu)
        }, [menuOpen])

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

        const components = useMemo<Components>(
            () => ({
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
                                transition: 'opacity 0.2s, transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                ;(e.target as HTMLElement).style.opacity = '0.9'
                            }}
                            onMouseLeave={(e) => {
                                ;(e.target as HTMLElement).style.opacity = '1'
                            }}
                            loading="lazy"
                            {...props}
                        />
                    )
                }
            }),
            []
        )

        return (
            <div
                className="markdown-body text-sm leading-relaxed px-1"
                onContextMenu={handleContextMenu}
                style={{
                    contain: 'layout style paint',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere'
                }}
            >
                {failed || blocks.length === 0 ? (
                    <div className="whitespace-pre-wrap break-words">
                        {content}
                    </div>
                ) : (
                    <MarkdownBlocks blocks={blocks} components={components} />
                )}

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
            </div>
        )
    }
)

MarkdownContent.displayName = 'MarkdownContent'
