import { useI18n } from '@/lib/i18n'
import { FolderInput } from 'lucide-react'
import { EmptyState as AssetEmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    onImport: () => void
    onCreate: () => void
}

export function EmptyState({ onImport, onCreate }: EmptyStateProps) {
    const t = useI18n()
    return (
        <AssetEmptyState
            icon={FolderInput}
            title={t('Create your own test set')}
            description={t(
                'Built-in test sets are available above. Create or import a custom set for your evaluations.'
            )}
            actions={
                <>
                    <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={onImport}
                    >
                        {t('Import Custom Tests')}
                    </Button>
                    <Button className="min-h-11" onClick={onCreate}>
                        {t('Create')}
                    </Button>
                </>
            }
        />
    )
}
