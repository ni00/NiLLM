import { useI18n } from '@/lib/i18n'
import { FolderInput } from 'lucide-react'

interface EmptyStateProps {
    onImport: () => void
}

export function EmptyState({ onImport }: EmptyStateProps) {
    const t = useI18n()
    return (
        <div
            className="flex flex-col items-center justify-center p-12 bg-muted/10 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={onImport}
        >
            <FolderInput className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">
                {t('Import Custom Tests')}
            </h3>
            <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2">
                {t(
                    'Drag and drop your JSON benchmark files here to run custom evaluations.'
                )}
            </p>
        </div>
    )
}
