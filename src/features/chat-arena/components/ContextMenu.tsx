import { createPortal } from 'react-dom'
import { Copy, Check, Download, ZoomIn } from 'lucide-react'

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
    if (!isOpen) return null

    const menuHeight = hasImage ? 90 : 40
    const menuWidth = 160

    return createPortal(
        <div
            className="fixed z-[100] min-w-[160px] overflow-hidden rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm p-1 text-popover-foreground shadow-xl"
            style={{
                top: Math.min(position.y, window.innerHeight - menuHeight),
                left: Math.min(position.x, window.innerWidth - menuWidth),
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
                        className="relative flex w-full cursor-default select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ZoomIn className="mr-2.5 h-4 w-4 opacity-60" />
                        <span>View Full Size</span>
                    </button>
                    <button
                        onClick={() => {
                            onDownloadImage?.()
                            onClose()
                        }}
                        className="relative flex w-full cursor-default select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <Download className="mr-2.5 h-4 w-4 opacity-60" />
                        <span>Download Image</span>
                    </button>
                    <div className="my-1 h-px bg-border/50" />
                </>
            )}
            <button
                onClick={onCopy}
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
    )
}
