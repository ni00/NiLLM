import { useI18n } from '@/lib/i18n'
import type { ConfigSource } from '@/lib/types'
import { Undo2 } from 'lucide-react'

interface FieldOverrideProps {
    path: string
    sources?: Record<string, ConfigSource>
    onResetField?: (path: string) => void
}

/**
 * "Inherit again" control shown next to fields overridden by the layer being
 * edited. Absent in the global editor, which owns the base values and passes
 * no `sources`.
 */
export function FieldOverride({
    path,
    sources,
    onResetField
}: FieldOverrideProps) {
    const t = useI18n()
    const source = sources?.[path]
    if (!sources || !onResetField || !source || source === 'global') return null
    return (
        <button
            type="button"
            aria-label={t('Reset to inherited')}
            title={t('Reset to inherited')}
            onClick={() => onResetField(path)}
            className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
            <Undo2 className="w-3 h-3" />
        </button>
    )
}
