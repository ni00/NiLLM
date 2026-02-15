import React from 'react'
import { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
    title: string
    description?: string
    icon?: LucideIcon
    actions?: React.ReactNode
    children?: React.ReactNode
    className?: string
    /**
     * If true, wraps children in a ScrollArea.
     * If false, children take up available space (flex-1) and must handle their own scrolling.
     * @default true
     */
    isScrollable?: boolean
    /**
     * Padding for the content area. Defaults to "p-6" if scrollable.
     * Can be customized.
     */
    contentClassName?: string
}

export function PageLayout({
    title,
    description,
    icon,
    actions,
    children,
    className,
    isScrollable = true,
    contentClassName,
    headerClassName
}: PageLayoutProps & { headerClassName?: string }) {
    return (
        <div
            className={cn(
                'flex flex-col h-full bg-background overflow-hidden relative',
                className
            )}
        >
            <PageHeader
                title={title}
                description={description}
                icon={icon}
                className={cn(
                    'p-4 md:p-6 pb-4 border-b flex-shrink-0',
                    headerClassName
                )}
            >
                {actions}
            </PageHeader>

            {isScrollable ? (
                <ScrollArea className="flex-1 w-full min-h-0">
                    <div
                        className={cn(
                            'flex flex-col gap-6 overflow-x-hidden',
                            contentClassName || 'p-4 md:p-6'
                        )}
                    >
                        {children}
                    </div>
                </ScrollArea>
            ) : (
                <div
                    className={cn(
                        'flex-1 flex flex-col min-h-0 overflow-hidden relative',
                        contentClassName
                    )}
                >
                    {children}
                </div>
            )}
        </div>
    )
}
