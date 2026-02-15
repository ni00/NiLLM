import { AlertCircle } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'

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
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent className="border-destructive/20 shadow-destructive/5 max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 text-destructive mb-1">
                        <div className="p-2 bg-destructive/10 rounded-full">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <AlertDialogTitle>
                            Clear Model Statistics?
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                        This will{' '}
                        <span className="font-bold text-foreground">
                            permanently delete
                        </span>{' '}
                        all performance data for{' '}
                        <span className="font-medium text-foreground">
                            "{modelName}"
                        </span>
                        .
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
                    >
                        Clear Data
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
