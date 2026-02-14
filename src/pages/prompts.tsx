import { BookTemplate, Plus, FolderInput } from 'lucide-react'
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

import { usePrompts } from '@/features/prompts/hooks/usePrompts'
import { PromptCard } from '@/features/prompts/components/PromptCard'
import { PromptEditor } from '@/features/prompts/components/PromptEditor'
import { VariableFiller } from '@/features/prompts/components/VariableFiller'
import { EmptyPrompts } from '@/features/prompts/components/EmptyPrompts'
import { PromptTemplate } from '@/lib/types'
import { useState } from 'react'

interface SortablePromptCardProps {
    template: PromptTemplate
    onEdit: (template: PromptTemplate) => void
    onExport: (template: PromptTemplate) => void
    onDelete: (id: string) => void
    onUse: (template: PromptTemplate) => void
}

function SortablePromptCard({ template, ...props }: SortablePromptCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: template.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="h-full">
            <PromptCard
                template={template}
                dragHandleProps={{ ...attributes, ...listeners }}
                {...props}
            />
        </div>
    )
}

export function PromptsPage() {
    const {
        promptTemplates,
        isEditing,
        editingId,
        editForm,
        isUsing,
        usingTemplate,
        variableValues,
        isGenerating,
        selectedModelId,
        models,
        setEditForm,
        setIsEditing,
        setVariableValues,
        setSelectedModelId,
        setIsUsing,
        handleCreate,
        handleEdit,
        handleDelete,
        handleSave,
        handleExport,
        handleImport,
        handleUse,
        handleFillAndUse,
        handleAutoFill,
        handleDragEnd
    } = usePrompts()

    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    )

    const activeTemplate = activeId
        ? promptTemplates.find((t) => t.id === activeId)
        : null

    return (
        <PageLayout
            title="Prompt Templates"
            description="Manage and use reusable prompt templates with variable support."
            icon={BookTemplate}
            actions={
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleImport}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept=".json"
                            title="Import JSON Template"
                        />
                        <Button
                            variant="outline"
                            className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2"
                        >
                            <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="hidden md:inline text-xs font-medium">
                                Import
                            </span>
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleCreate}
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2"
                    >
                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Create
                        </span>
                    </Button>
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
                    items={promptTemplates.map((t) => t.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-10">
                        {promptTemplates.map((tmpl) => (
                            <SortablePromptCard
                                key={tmpl.id}
                                template={tmpl}
                                onEdit={handleEdit}
                                onExport={handleExport}
                                onDelete={handleDelete}
                                onUse={handleUse}
                            />
                        ))}
                        {promptTemplates.length === 0 && (
                            <EmptyPrompts
                                onImport={() => {}}
                                onCreate={handleCreate}
                            />
                        )}
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
                    {activeId && activeTemplate ? (
                        <PromptCard
                            template={activeTemplate}
                            onEdit={() => {}}
                            onExport={() => {}}
                            onDelete={() => {}}
                            onUse={() => {}}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <PromptEditor
                isOpen={isEditing}
                editingId={editingId}
                editForm={editForm}
                onClose={() => setIsEditing(false)}
                onSave={handleSave}
                onChange={setEditForm}
            />

            <VariableFiller
                isOpen={isUsing}
                template={usingTemplate}
                variableValues={variableValues}
                selectedModelId={selectedModelId}
                isGenerating={isGenerating}
                models={models}
                onClose={() => setIsUsing(false)}
                onUse={handleFillAndUse}
                onAutoFill={handleAutoFill}
                onChangeVariable={(name, value) =>
                    setVariableValues((prev) => ({ ...prev, [name]: value }))
                }
                onSelectModel={setSelectedModelId}
            />
        </PageLayout>
    )
}

export const Component = PromptsPage
