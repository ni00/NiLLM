import React from 'react'
import { LLMModel } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ArenaModelSelectorProps {
    models: LLMModel[]
    activeModelIds: string[]
    onToggleModel: (id: string) => void
}

export const ArenaModelSelector = React.memo(
    ({ models, activeModelIds, onToggleModel }: ArenaModelSelectorProps) => {
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Model Selection</h4>
                    <p className="text-xs text-muted-foreground">
                        Select the models to compare in the arena.
                    </p>
                </div>
                <div className="grid gap-2 border rounded-xl overflow-hidden bg-background shadow-sm">
                    {models.map((model) => (
                        <div
                            key={model.id}
                            className={cn(
                                'flex items-center gap-3 p-3 transition-colors border-b last:border-0 hover:bg-muted/30',
                                activeModelIds.includes(model.id)
                                    ? 'bg-primary/5'
                                    : ''
                            )}
                        >
                            <input
                                type="checkbox"
                                id={`arena-model-${model.id}`}
                                checked={activeModelIds.includes(model.id)}
                                onChange={() => onToggleModel(model.id)}
                                className="rounded border-border bg-background h-4 w-4 accent-primary cursor-pointer"
                            />
                            <label
                                htmlFor={`arena-model-${model.id}`}
                                className="flex-1 cursor-pointer min-w-0"
                            >
                                <div className="text-sm font-bold tracking-tight truncate">
                                    {model.name}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate uppercase mt-0.5">
                                    {model.providerName || model.provider}
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
)

ArenaModelSelector.displayName = 'ArenaModelSelector'
