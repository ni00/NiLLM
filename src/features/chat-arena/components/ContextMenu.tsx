import { useI18n } from '@/lib/i18n'
import { createPortal } from 'react-dom'
import { Copy, Check, Download, ZoomIn } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'

interface ContextMenuProps {
    isOpen: boolean
    position: { x: number; y: number }
    hasImage: boolean
    copied: boolean
    onCopy: () => void
    onViewImage?: () => void
    onDownloadImage?: () => void
    onClose: () => void
}

export function ContextMenu({
    isOpen,
    position,
    hasImage,
    copied,
    onCopy,
    onViewImage,
    onDownloadImage,
    onClose
}: ContextMenuProps) {
    const t = useI18n()
    const menuRef = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
        const menu = menuRef.current
        if (!menu) return
        menu.style.top = `${Math.max(8, Math.min(position.y, window.innerHeight - menu.offsetHeight - 8))}px`
        menu.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - menu.offsetWidth - 8))}px`
    }, [isOpen, hasImage, position.x, position.y])
    if (!isOpen) return null

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[100] min-w-[160px] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            style={{
                top: position.y,
                left: position.x,
                animation: 'fadeInScale 0.15s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {hasImage && (
                <>
                    <button
                        onClick={() => {
                            onViewImage?.()
                            onClose()
                        }}
                        className="relative flex min-h-11 w-full cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-accent focus-visible:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground transition-colors"
                    >
                        <ZoomIn className="mr-2.5 h-4 w-4 opacity-60" />
                        <span>{t('View Full Size')}</span>
                    </button>
                    <button
                        onClick={() => {
                            onDownloadImage?.()
                            onClose()
                        }}
                        className="relative flex min-h-11 w-full cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-accent focus-visible:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground transition-colors"
                    >
                        <Download className="mr-2.5 h-4 w-4 opacity-60" />
                        <span>{t('Download Image')}</span>
                    </button>
                    <div className="my-1 h-px bg-border/50" />
                </>
            )}
            <button
                onClick={onCopy}
                className="relative flex min-h-11 w-full cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-accent focus-visible:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground transition-colors"
            >
                {copied ? (
                    <Check className="mr-2.5 h-4 w-4 text-green-500" />
                ) : (
                    <Copy className="mr-2.5 h-4 w-4 opacity-60" />
                )}
                <span>{copied ? t('Copied') : t('Copy Text')}</span>
            </button>
        </div>,
        document.body
    )
}
