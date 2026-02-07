import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Trash2,
    Plus,
    Copy,
    Pencil,
    Cpu,
    Zap,
    Clock,
    BarChart3
} from 'lucide-react'
import { LLMModel } from '@/lib/types'
import { PageHeader } from '@/components/ui/page-header'

export function ModelsPage() {
    const {
        models,
        addModel,
        updateModel,
        deleteModel,
        activeModelIds,
        toggleModelActivation,
        sessions
    } = useAppStore()
    const [editingModelId, setEditingModelId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [newModel, setNewModel] = useState<Partial<LLMModel>>({
        provider: 'openrouter',
        enabled: true
    })

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

    return (
        <div className="flex flex-col h-full gap-6 p-6 overflow-hidden bg-background">
            <PageHeader
                title="Models"
                description="Manage your LLM providers and configuration."
                icon={Cpu}
            >
                {!isAdding && (
                    <Button
                        onClick={() => {
                            setIsAdding(true)
                            setEditingModelId(null)
                            setNewModel({
                                provider: 'openrouter',
                                enabled: true
                            })
                        }}
                        className="h-10 px-4 shadow-xl shadow-primary/10 transition-all active:scale-95"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Model
                    </Button>
                )}
            </PageHeader>

            <ScrollArea className="flex-1 min-h-0 -mr-4 pr-4">
                <div className="flex flex-col gap-8 pb-8">
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {models.map((model) => {
                            const isActive = activeModelIds.includes(model.id)

                            // Calculate quick stats for this specific model card
                            let totalTPS = 0,
                                tpsCount = 0
                            let totalTTFT = 0,
                                ttftCount = 0
                            let totalTokens = 0

                            sessions.forEach((session) => {
                                const results = session.results[model.id] || []
                                results.forEach((r) => {
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

                            const avgTPS =
                                tpsCount > 0
                                    ? (totalTPS / tpsCount).toFixed(1)
                                    : '-'
                            const avgTTFT =
                                ttftCount > 0
                                    ? (totalTTFT / ttftCount).toFixed(0)
                                    : '-'

                            return (
                                <Card
                                    key={model.id}
                                    className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-card/80 via-card/50 to-muted/5 backdrop-blur-2xl border-border/30"
                                >
                                    {/* Active Glow Indicator */}
                                    <div
                                        className={`absolute top-0 left-0 w-[3px] h-full transition-all duration-700 ${isActive ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'bg-transparent opacity-0'}`}
                                    />

                                    <div className="p-6 flex flex-col gap-6">
                                        {/* Top: Tech Identity & Status */}
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1.5 flex-1 min-w-0 mr-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[11px] font-bold tracking-[0.1em] text-primary uppercase">
                                                        {model.providerName ||
                                                            model.provider}
                                                    </span>
                                                    {model.baseURL && (
                                                        <span className="text-[10px] text-muted-foreground font-medium opacity-60 truncate">
                                                            •{' '}
                                                            {
                                                                model.baseURL
                                                                    ?.split(
                                                                        '//'
                                                                    )[1]
                                                                    ?.split(
                                                                        '/'
                                                                    )[0]
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                <h3
                                                    className="text-xl font-extrabold tracking-tight text-foreground truncate"
                                                    title={model.name}
                                                >
                                                    {model.name}
                                                </h3>
                                            </div>
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={() =>
                                                    toggleModelActivation(
                                                        model.id
                                                    )
                                                }
                                                className="scale-90 data-[state=checked]:bg-primary shadow-sm"
                                            />
                                        </div>

                                        {/* Middle: Performance Matrix */}
                                        <div className="grid grid-cols-3 gap-3 py-4 border-y border-border/10">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                                    <Zap className="h-3 w-3 text-yellow-500" />{' '}
                                                    Speed
                                                </span>
                                                <span className="text-base font-mono font-bold text-foreground">
                                                    {avgTPS}
                                                    <span className="text-[10px] ml-0.5 font-normal opacity-50">
                                                        t/s
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-blue-500" />{' '}
                                                    Latency
                                                </span>
                                                <span className="text-base font-mono font-bold text-foreground">
                                                    {avgTTFT}
                                                    <span className="text-[10px] ml-0.5 font-normal opacity-50">
                                                        ms
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                                    <BarChart3 className="h-3 w-3 text-green-500" />{' '}
                                                    Tokens
                                                </span>
                                                <span className="text-base font-mono font-bold text-foreground">
                                                    {(
                                                        totalTokens / 1000
                                                    ).toFixed(1)}
                                                    <span className="text-[10px] ml-0.5 font-normal opacity-50">
                                                        k
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom: Internal ID & Explicit Actions */}
                                        <div className="flex items-center justify-between gap-4">
                                            <code
                                                className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded font-mono truncate flex-1"
                                                title={model.providerId}
                                            >
                                                {model.providerId}
                                            </code>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                                                    onClick={() =>
                                                        handleDuplicateModel(
                                                            model
                                                        )
                                                    }
                                                    title="Duplicate"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                                                    onClick={() =>
                                                        handleEditClick(model)
                                                    }
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                                                    onClick={() =>
                                                        deleteModel(model.id)
                                                    }
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </ScrollArea>

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
                                        <select
                                            className="flex h-10 w-full rounded-md border border-border/50 bg-muted/20 px-3 py-1 text-sm shadow-sm transition-all focus:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                                            value={newModel.provider}
                                            onChange={(e) =>
                                                setNewModel({
                                                    ...newModel,
                                                    provider: e.target
                                                        .value as any
                                                })
                                            }
                                        >
                                            <option value="openrouter">
                                                OpenRouter
                                            </option>
                                            <option value="openai">
                                                OpenAI
                                            </option>
                                            <option value="anthropic">
                                                Anthropic
                                            </option>
                                            <option value="google">
                                                Google
                                            </option>
                                            <option value="custom">
                                                Custom (OpenAI Compatible)
                                            </option>
                                        </select>
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
        </div>
    )
}

export const Component = ModelsPage
