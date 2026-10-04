import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
    title: string
    icon?: LucideIcon
    children?: React.ReactNode
    className?: string
}

export function PageHeader({
    title,
    icon: Icon,
    children,
    className
}: PageHeaderProps) {
    return (
        <header className={cn('flex flex-col gap-1', className)}>
            <div className="flex items-center justify-between gap-4">
                <div
                    className={cn(
                        'flex flex-col gap-1 overflow-hidden',
                        children && 'hidden md:flex'
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        {Icon && (
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                <Icon className="h-5 w-5" />
                            </div>
                        )}
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight truncate md:whitespace-nowrap">
                            {title}
                        </h1>
                    </div>
                </div>
                {children && (
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {children}
                    </div>
                )}
            </div>
        </header>
    )
}
