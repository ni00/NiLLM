import {
    ConfigSource,
    GenerationConfig,
    GenerationConfigPatch
} from '@/lib/types'

interface SectionHeaderProps {
    title: string
}

export function SectionHeader({ title }: SectionHeaderProps) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-2 whitespace-nowrap">
                {title}
            </span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    )
}

export interface ConfigSectionProps {
    /** Effective values for display; layers below already merged in. */
    config: GenerationConfig
    /** Emits only the fields the user changed. */
    onChange: (updates: GenerationConfigPatch) => void
    /** Field provenance by dot path; absent for the global base editor. */
    sources?: Record<string, ConfigSource>
    /** Removes one overridden field so it inherits again. */
    onResetField?: (path: string) => void
}
