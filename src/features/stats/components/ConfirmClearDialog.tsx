import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ConfirmClearDialogProps {
    isOpen: boolean
    modelName?: string
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmClearDialog({
    isOpen,
    modelName,
    onConfirm,
    onCancel
}: ConfirmClearDialogProps) {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onCancel}
        >
            <div
                className="bg-background border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <h3 className="text-lg font-bold">
                            Clear Model Statistics?
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                        This will permanently delete all performance data for "
                        {modelName}".
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={onConfirm}
                        >
                            Clear Data
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
