import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'

interface ImageLightboxProps {
    src: string
    onClose: () => void
    onDownload: (src: string) => Promise<void>
}

export function ImageLightbox({
    src,
    onClose,
    onDownload
}: ImageLightboxProps) {
    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            <button
                onClick={onClose}
                className="absolute z-10 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
                style={{
                    top: 'calc(1rem + var(--safe-area-inset-top, 0px))',
                    right: '1rem'
                }}
            >
                <X className="h-6 w-6" />
            </button>

            <button
                onClick={async (e) => {
                    e.stopPropagation()
                    await onDownload(src)
                }}
                className="absolute z-10 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
                style={{
                    top: 'calc(1rem + var(--safe-area-inset-top, 0px))',
                    right: '4rem'
                }}
            >
                <Download className="h-6 w-6" />
            </button>

            <img
                src={src}
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
    )
}
