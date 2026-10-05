import { useI18n } from '@/lib/i18n'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter
} from '@/components/ui/dialog'

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
    const t = useI18n()
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="max-w-6xl h-[85dvh]"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>{t('Full size image')}</DialogTitle>
                </DialogHeader>
                <DialogBody className="flex items-center justify-center">
                    <img
                        src={src}
                        alt={t('Full size image')}
                        className="min-h-0 max-h-full max-w-full object-contain rounded-lg"
                    />
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => void onDownload(src)}
                    >
                        <Download className="h-4 w-4" />
                        {t('Download Image')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
