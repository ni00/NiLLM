import { useState } from 'react'
import { Cpu, Plus, FolderInput, FolderOutput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { PageLayout } from '@/features/layout/PageLayout'
import { useModels } from '@/features/models/hooks/useModels'
import { ModelCard } from '@/features/models/components/ModelCard'
import { ModelEditor } from '@/features/models/components/ModelEditor'
import { LLMModel } from '@/lib/types'

interface SortableModelCardProps {
    model: LLMModel
    isActive: boolean
    stats: {
        avgTPS: string
        avgTTFT: string
        totalTokens: number
    }
    onEdit: (model: LLMModel) => void
    onDuplicate: (model: LLMModel) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
}

function SortableModelCard({
    model,
    isActive,
    stats,
    onEdit,
    onDuplicate,
    onDelete,
    onToggle
}: SortableModelCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: model.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="h-full">
            <ModelCard
                model={model}
                isActive={isActive}
                avgTPS={stats.avgTPS}
                avgTTFT={stats.avgTTFT}
                totalTokens={stats.totalTokens}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggle={onToggle}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    )
}

export function ModelsPage() {
    const {
        models,
        activeModelIds,
        isAdding,
        editingModelId,
        newModel,
        setIsAdding,
        setNewModel,
        setEditingModelId,
        handleSaveModel,
        handleEditClick,
        handleCancel,
        handleDuplicateModel,
        getModelStats,
        handleDragEnd,
        handleImport,
        handleExport,
        deleteModel,
        toggleModelActivation
    } = useModels()

    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    )

    const activeModel = activeId ? models.find((m) => m.id === activeId) : null

    return (
        <PageLayout
            title="Models"
            description="Manage your LLM providers and configuration."
            icon={Cpu}
            actions={
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="import-models"
                        className="hidden"
                        accept=".json"
                        onChange={handleImport}
                    />
                    <Button
                        variant="outline"
                        onClick={() =>
                            document.getElementById('import-models')?.click()
                        }
                        className="h-10 px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">Import</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="h-10 px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <FolderOutput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">Export</span>
                    </Button>
                    {!isAdding && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAdding(true)
                                setEditingModelId(null)
                                setNewModel({
                                    provider: 'openrouter',
                                    enabled: true
                                })
                            }}
                            className="h-10 px-4 group gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-xs font-medium">Add</span>
                        </Button>
                    )}
                </div>
            }
        >
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id as string)}
                onDragEnd={(e) => {
                    handleDragEnd(e)
                    setActiveId(null)
                }}
                modifiers={[restrictToParentElement]}
            >
                <SortableContext
                    items={models.map((m: LLMModel) => m.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {models.map((model: LLMModel) => {
                            const isActive = activeModelIds.includes(model.id)
                            const stats = getModelStats(model)

                            return (
                                <SortableModelCard
                                    key={model.id}
                                    model={model}
                                    isActive={isActive}
                                    stats={stats}
                                    onEdit={handleEditClick}
                                    onDuplicate={handleDuplicateModel}
                                    onDelete={deleteModel}
                                    onToggle={toggleModelActivation}
                                />
                            )
                        })}
                    </div>
                </SortableContext>

                <DragOverlay
                    dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: {
                                    opacity: '0.3'
                                }
                            }
                        })
                    }}
                >
                    {activeId && activeModel ? (
                        <ModelCard
                            model={activeModel}
                            isActive={activeModelIds.includes(activeId)}
                            {...getModelStats(activeModel)}
                            onEdit={() => {}}
                            onDuplicate={() => {}}
                            onDelete={() => {}}
                            onToggle={() => {}}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <ModelEditor
                isOpen={isAdding}
                editingId={editingModelId}
                modelData={newModel}
                onClose={handleCancel}
                onSave={handleSaveModel}
                onChange={setNewModel}
            />
        </PageLayout>
    )
}

export const Component = ModelsPage
