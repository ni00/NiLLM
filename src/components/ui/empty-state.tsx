import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actions: ReactNode
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actions
}: EmptyStateProps) {
    return (
        <section className="col-span-full rounded-lg border border-dashed bg-muted/10 p-6 sm:p-8 text-center">
            <Icon
                aria-hidden="true"
                className="mx-auto mb-4 size-10 text-muted-foreground"
            />
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {description}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
                {actions}
            </div>
        </section>
    )
}
