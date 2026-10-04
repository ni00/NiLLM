import { useState, useMemo, useDeferredValue } from 'react'
import { Input } from '@/components/ui/input'
import { ProviderImportDialog } from '@/features/models/components/ProviderImportDialog'
import { groupModels } from '@/features/models/domain/models'
import type { ProviderConnection } from '@/lib/providers/discovery'
import { useAppStore } from '@/lib/store'
import { Cpu, Plus, FolderInput, Download } from 'lucide-react'
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

    const [providerDialog, setProviderDialog] = useState<
        ProviderConnection | null | false
    >(false)
    const [query, setQuery] = useState('')
    const search = useDeferredValue(query.toLowerCase())
    const [notice, setNotice] = useState('')
    const [limits, setLimits] = useState<Record<string, number>>({})
    const groups = useMemo(
        () =>
            groupModels(
                models.filter((model) =>
                    `${model.name} ${model.providerId || ''} ${model.providerName || model.provider}`
                        .toLowerCase()
                        .includes(search)
                )
            ),
        [models, search]
    )
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Import
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Export
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setProviderDialog(null)}
                        className="h-9 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs">Add provider</span>
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
                            className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="hidden md:inline text-xs font-medium">
                                Add
                            </span>
                        </Button>
                    )}
                </div>
            }
        >
            <div className="mb-6 space-y-2">
                <Input
                    aria-label="Search configured models"
                    placeholder="Search models or providers…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {notice && (
                    <p role="status" className="text-sm text-muted-foreground">
                        {notice}
                    </p>
                )}
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id as string)}
                onDragCancel={() => setActiveId(null)}
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
                    <div className="space-y-8">
                        {groups.map((group) => {
                            const allSelected = group.models.every((m) =>
                                activeModelIds.includes(m.id)
                            )
                            const limit = limits[group.key] || 24
                            return (
                                <section key={group.key} className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-semibold">
                                                {group.label}{' '}
                                                <span className="text-xs text-muted-foreground">
                                                    {group.models.length} models
                                                    ·{' '}
                                                    {
                                                        group.models.filter(
                                                            (m) =>
                                                                activeModelIds.includes(
                                                                    m.id
                                                                )
                                                        ).length
                                                    }{' '}
                                                    active
                                                </span>
                                            </h2>
                                            {group.endpoint && (
                                                <p
                                                    className="text-xs text-muted-foreground truncate max-w-lg"
                                                    title={group.endpoint}
                                                >
                                                    {group.endpoint}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setProviderDialog(
                                                        group.models[0]
                                                    )
                                                }
                                            >
                                                Fetch all models
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    useAppStore
                                                        .getState()
                                                        .setModelGroupActive(
                                                            group.models.map(
                                                                (m) => m.id
                                                            ),
                                                            !allSelected
                                                        )
                                                }
                                            >
                                                {allSelected
                                                    ? 'Deselect provider'
                                                    : 'Select provider'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                        {group.models
                                            .slice(0, limit)
                                            .map((model) => (
                                                <SortableModelCard
                                                    key={model.id}
                                                    model={model}
                                                    isActive={activeModelIds.includes(
                                                        model.id
                                                    )}
                                                    stats={getModelStats(model)}
                                                    onEdit={handleEditClick}
                                                    onDuplicate={
                                                        handleDuplicateModel
                                                    }
                                                    onDelete={deleteModel}
                                                    onToggle={
                                                        toggleModelActivation
                                                    }
                                                />
                                            ))}
                                    </div>
                                    {group.models.length > limit && (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setLimits((previous) => ({
                                                    ...previous,
                                                    [group.key]: limit + 24
                                                }))
                                            }
                                        >
                                            Show more (
                                            {group.models.length - limit}{' '}
                                            remaining)
                                        </Button>
                                    )}
                                </section>
                            )
                        })}
                        {!groups.length && (
                            <p className="py-12 text-center text-muted-foreground">
                                No models match your search.
                            </p>
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

            {providerDialog !== false && (
                <ProviderImportDialog
                    initialConnection={providerDialog || undefined}
                    onClose={() => setProviderDialog(false)}
                    onAdded={(count) =>
                        setNotice(
                            count
                                ? `Added ${count} models.`
                                : 'All selected models are already configured.'
                        )
                    }
                />
            )}
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
