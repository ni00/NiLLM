import React from 'react'
import { LLMModel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Check, GripVertical } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface ArenaModelSelectorProps {
    models: LLMModel[]
    activeModelIds: string[]
    onToggleModel: (id: string) => void
    onToggleAll: () => void
    onReorder: (fromIndex: number, toIndex: number) => void
}

interface SortableModelItemProps {
    model: LLMModel
    isActive: boolean
    onToggle: () => void
}

const SortableModelItem = ({
    model,
    isActive,
    onToggle
}: SortableModelItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: model.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-3 p-3 transition-colors border-b last:border-0 hover:bg-muted/30 group',
                isActive ? 'bg-primary/5' : 'bg-background',
                isDragging
                    ? 'opacity-50 shadow-lg border-primary/20 bg-muted/50'
                    : ''
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/30 hover:text-primary transition-colors"
                title="Drag to reorder"
            >
                <GripVertical className="w-4 h-4" />
            </div>

            <input
                type="checkbox"
                id={`arena-model-${model.id}`}
                checked={isActive}
                onChange={onToggle}
                className="rounded border-border bg-background h-4 w-4 accent-primary cursor-pointer shrink-0"
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
    )
}

export const ArenaModelSelector = React.memo(
    ({
        models,
        activeModelIds,
        onToggleModel,
        onToggleAll,
        onReorder
    }: ArenaModelSelectorProps) => {
        const sensors = useSensors(
            useSensor(PointerSensor, {
                activationConstraint: {
                    distance: 5 // Avoid accidental drags when clicking checkbox
                }
            }),
            useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates
            })
        )

        const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event
            if (over && active.id !== over.id) {
                const oldIndex = models.findIndex((m) => m.id === active.id)
                const newIndex = models.findIndex((m) => m.id === over.id)
                onReorder(oldIndex, newIndex)
            }
        }

        const isAllSelected =
            activeModelIds.length > 0 &&
            activeModelIds.length === models.filter((m) => m.enabled).length

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">
                            Model Selection
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Select the models to compare in the arena.
                        </p>
                    </div>
                    <button
                        onClick={onToggleAll}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all border',
                            isAllSelected
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        {isAllSelected && <Check className="w-3 h-3" />}
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={models.map((m) => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="flex flex-col">
                                {models.map((model) => (
                                    <SortableModelItem
                                        key={model.id}
                                        model={model}
                                        isActive={activeModelIds.includes(
                                            model.id
                                        )}
                                        onToggle={() => onToggleModel(model.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        )
    }
)

ArenaModelSelector.displayName = 'ArenaModelSelector'
