import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import {
    Trash2,
    Plus,
    Copy,
    Pencil,
    Cpu,
    Zap,
    Clock,
    BarChart3,
    GripVertical,
    FolderInput,
    FolderOutput
} from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { LLMModel } from '@/lib/types'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
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

interface SortableCardProps {
    model: LLMModel
    isActive: boolean
    avgTPS: string
    avgTTFT: string
    totalTokens: number
    onEdit: (model: LLMModel) => void
    onDuplicate: (model: LLMModel) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
    isOverlay?: boolean
}

function ModelCardContent({
    model,
    isActive,
    avgTPS,
    avgTTFT,
    totalTokens,
    onEdit,
    onDuplicate,
    onDelete,
    onToggle,
    isOverlay,
    dragHandleProps
}: SortableCardProps & { dragHandleProps?: any }) {
    return (
        <Card
            className={`group relative overflow-hidden h-full transition-all duration-300 ${isOverlay ? 'shadow-2xl scale-105 border-primary/50' : 'hover:shadow-lg'} bg-gradient-to-br from-card/80 via-card/50 to-muted/5 backdrop-blur-xl border-border/30`}
        >
            {/* Active Glow Indicator */}
            <div
                className={`absolute top-0 left-0 w-[2px] h-full transition-all duration-500 ${isActive ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'bg-transparent opacity-0'}`}
            />

            <div className="p-4 flex flex-col gap-3 h-full">
                {/* Top: Tech Identity & Status */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div
                                {...dragHandleProps}
                                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted/50 rounded transition-colors"
                            >
                                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                            </div>
                            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
                                {model.providerName || model.provider}
                            </span>
                        </div>
                        <h3
                            className="text-sm font-bold tracking-tight text-foreground truncate"
                            title={model.name}
                        >
                            {model.name}
                        </h3>
                    </div>
                    <Switch
                        checked={isActive}
                        onCheckedChange={() => onToggle(model.id)}
                        className="scale-75 data-[state=checked]:bg-primary"
                    />
                </div>

                {/* Middle: Performance Matrix */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/10">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5 text-yellow-500" />{' '}
                            Speed
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {avgTPS}
                            <span className="text-[9px] ml-0.5 font-normal opacity-50">
                                t/s
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-blue-500" />{' '}
                            Latency
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {avgTTFT}
                            <span className="text-[9px] ml-0.5 font-normal opacity-50">
                                ms
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                            <BarChart3 className="h-2.5 w-2.5 text-green-500" />{' '}
                            Tokens
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {(totalTokens / 1000).toFixed(1)}
                            <span className="text-[9px] ml-0.5 font-normal opacity-50">
                                k
                            </span>
                        </span>
                    </div>
                </div>

                {/* Bottom: Internal ID & Explicit Actions */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <code
                        className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded font-mono truncate flex-1 opacity-70"
                        title={model.providerId}
                    >
                        {model.providerId}
                    </code>

                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onDuplicate(model)}
                            title="Duplicate"
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onEdit(model)}
                            title="Edit"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onDelete(model.id)}
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function SortableModelCard(props: SortableCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.model.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="h-full">
            <ModelCardContent
                {...props}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    )
}

export function ModelsPage() {
    const {
        models,
        addModel,
        updateModel,
        deleteModel,
        activeModelIds,
        toggleModelActivation,
        reorderModels,
        sessions
    } = useAppStore()
    const [editingModelId, setEditingModelId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [newModel, setNewModel] = useState<Partial<LLMModel>>({
        provider: 'openrouter',
        enabled: true
    })

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = models.findIndex((m) => m.id === active.id)
            const newIndex = models.findIndex((m) => m.id === over.id)
            reorderModels(oldIndex, newIndex)
        }
        setActiveId(null)
    }

    const handleSaveModel = () => {
        if (!newModel.name || !newModel.providerId) return

        if (editingModelId) {
            updateModel(editingModelId, newModel)
            setEditingModelId(null)
        } else {
            addModel({
                id: crypto.randomUUID(),
                name: newModel.name,
                provider: newModel.provider as any,
                providerName: newModel.providerName,
                providerId: newModel.providerId,
                apiKey: newModel.apiKey,
                baseURL: newModel.baseURL,
                enabled: true
            })
        }
        setIsAdding(false)
        setNewModel({ provider: 'openrouter', enabled: true })
    }

    const handleEditClick = (model: LLMModel) => {
        setNewModel(model)
        setEditingModelId(model.id)
        setIsAdding(true)
    }

    const handleCancel = () => {
        setIsAdding(false)
        setEditingModelId(null)
        setNewModel({ provider: 'openrouter', enabled: true })
    }

    const handleDuplicateModel = (model: LLMModel) => {
        const duplicated: LLMModel = {
            ...model,
            id: crypto.randomUUID(),
            name: `${model.name} (Copy)`,
            enabled: true
        }
        addModel(duplicated)
    }

    const activeModel = models.find((m) => m.id === activeId)

    // Calculate stats for overlay
    const getStats = (model: LLMModel) => {
        let totalTPS = 0,
            tpsCount = 0
        let totalTTFT = 0,
            ttftCount = 0
        let totalTokens = 0

        sessions.forEach((session: any) => {
            const results = session.results[model.id] || []
            results.forEach((r: any) => {
                if (r.metrics?.tps > 0) {
                    totalTPS += r.metrics.tps
                    tpsCount++
                }
                if (r.metrics?.ttft > 0) {
                    totalTTFT += r.metrics.ttft
                    ttftCount++
                }
                if (r.metrics?.tokenCount > 0) {
                    totalTokens += r.metrics.tokenCount
                }
            })
        })

        return {
            avgTPS: tpsCount > 0 ? (totalTPS / tpsCount).toFixed(1) : '-',
            avgTTFT: ttftCount > 0 ? (totalTTFT / ttftCount).toFixed(0) : '-',
            totalTokens
        }
    }

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
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                                try {
                                    const { readJsonFile } =
                                        await import('@/lib/utils')
                                    const data = await readJsonFile(file)
                                    if (Array.isArray(data)) {
                                        const store = useAppStore.getState()
                                        store.importModels(data as LLMModel[])
                                    } else {
                                        alert('Invalid model data format')
                                    }
                                } catch (err) {
                                    console.error('Failed to import', err)
                                }
                                e.target.value = ''
                            }
                        }}
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
                        onClick={async () => {
                            const { downloadJson } = await import('@/lib/utils')
                            await downloadJson(
                                useAppStore.getState().models,
                                'nillm-models.json'
                            )
                        }}
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
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToParentElement]}
            >
                <SortableContext
                    items={models.map((m: LLMModel) => m.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {models.map((model: LLMModel) => {
                            const isActive = activeModelIds.includes(model.id)
                            const stats = getStats(model)

                            return (
                                <SortableModelCard
                                    key={model.id}
                                    model={model}
                                    isActive={isActive}
                                    avgTPS={stats.avgTPS}
                                    avgTTFT={stats.avgTTFT}
                                    totalTokens={stats.totalTokens}
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
                        <ModelCardContent
                            model={activeModel}
                            isActive={activeModelIds.includes(activeId)}
                            {...getStats(activeModel)}
                            onEdit={() => {}}
                            onDuplicate={() => {}}
                            onDelete={() => {}}
                            onToggle={() => {}}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Modal Dialog for Add/Edit */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-card border border-border/50 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight">
                                        {editingModelId
                                            ? 'Edit Model'
                                            : 'Add New Model'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Configure your {newModel.provider}{' '}
                                        adapter settings.
                                    </p>
                                </div>
                                <div className="p-2 rounded-full bg-primary/10 text-primary">
                                    <Cpu className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="grid gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                            Display Name
                                        </Label>
                                        <Input
                                            className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all"
                                            placeholder="e.g. GPT-4 Turbo"
                                            value={newModel.name || ''}
                                            onChange={(e) =>
                                                setNewModel({
                                                    ...newModel,
                                                    name: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                            Provider
                                        </Label>
                                        <SelectDropdown
                                            value={newModel.provider || ''}
                                            onChange={(val) =>
                                                setNewModel({
                                                    ...newModel,
                                                    provider: val as any
                                                })
                                            }
                                            className="h-10 border-border/50 bg-muted/20 transition-all justify-between"
                                            options={[
                                                {
                                                    label: 'OpenRouter',
                                                    value: 'openrouter'
                                                },
                                                {
                                                    label: 'OpenAI',
                                                    value: 'openai'
                                                },
                                                {
                                                    label: 'Anthropic',
                                                    value: 'anthropic'
                                                },
                                                {
                                                    label: 'Google',
                                                    value: 'google'
                                                },
                                                {
                                                    label: 'Custom (OpenAI Compatible)',
                                                    value: 'custom'
                                                }
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                            Model ID
                                        </Label>
                                        <Input
                                            className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all font-mono text-xs"
                                            placeholder="e.g. openai/gpt-4"
                                            value={newModel.providerId || ''}
                                            onChange={(e) =>
                                                setNewModel({
                                                    ...newModel,
                                                    providerId: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                            Provider Tag (Optional)
                                        </Label>
                                        <Input
                                            className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all"
                                            placeholder="e.g. DeepSeek"
                                            value={newModel.providerName || ''}
                                            onChange={(e) =>
                                                setNewModel({
                                                    ...newModel,
                                                    providerName: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                        Base URL (Optional override)
                                    </Label>
                                    <Input
                                        className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all font-mono text-xs"
                                        placeholder="https://api.example.com/v1"
                                        value={newModel.baseURL || ''}
                                        onChange={(e) =>
                                            setNewModel({
                                                ...newModel,
                                                baseURL: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                        API Key (Optional override)
                                    </Label>
                                    <Input
                                        type="password"
                                        className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all"
                                        placeholder="sk-..."
                                        value={newModel.apiKey || ''}
                                        onChange={(e) =>
                                            setNewModel({
                                                ...newModel,
                                                apiKey: e.target.value
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={handleCancel}
                                    className="h-11 px-6 text-muted-foreground border border-transparent hover:border-border"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveModel}
                                    className="h-11 px-10 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                >
                                    {editingModelId
                                        ? 'Update Configuration'
                                        : 'Save Model'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export const Component = ModelsPage
