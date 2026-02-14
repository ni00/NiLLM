import { GenerationConfig } from '@/lib/types'

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
    config: GenerationConfig
    onChange: (updates: Partial<GenerationConfig>) => void
}
