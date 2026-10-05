import { useI18n } from '@/lib/i18n'
import { BookTemplate } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface EmptyPromptsProps {
    onImport: () => void
    onCreate: () => void
}

export function EmptyPrompts({ onImport, onCreate }: EmptyPromptsProps) {
    const t = useI18n()
    return (
        <EmptyState
            icon={BookTemplate}
            title={t('No prompt templates yet')}
            description={t(
                'Create a reusable prompt template or import a JSON template.'
            )}
            actions={
                <>
                    <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={onImport}
                    >
                        {t('Import template')}
                    </Button>
                    <Button className="min-h-11" onClick={onCreate}>
                        {t('Create new')}
                    </Button>
                </>
            }
        />
    )
}
