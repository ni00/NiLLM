import { useState, ChangeEvent } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Plus, Copy, Pencil } from 'lucide-react'
import { LLMModel } from '@/lib/types'

export function SettingsPage() {
    const {
        models,
        addModel,
        updateModel,
        deleteModel,
        activeModelIds,
        toggleModelActivation
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
        <div className="flex flex-col h-full gap-4 p-6 max-w-5xl mx-auto w-full">
            {/* ... (Header and Add Form logic remains same, skipping for brevity in replacement if possible, but replace block needs context) */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Settings
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your LLM providers and API keys.
                    </p>
                </div>
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
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Model
                    </Button>
                )}
            </div>

            {isAdding && (
                <Card className="border-primary/30 bg-card/40 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold tracking-tight">
                            {editingModelId ? 'Edit Model' : 'Add New Model'}
                        </CardTitle>
                        <CardDescription>
                            Configure your custom LLM provider and endpoint
                            details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Display Name
                                </Label>
                                <Input
                                    className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                                    placeholder="e.g. GPT-4 Turbo"
                                    value={newModel.name || ''}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>
                                    ) =>
                                        setNewModel({
                                            ...newModel,
                                            name: e.target.value
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Provider
                                </Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-border/50 bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newModel.provider}
                                    onChange={(
                                        e: ChangeEvent<HTMLSelectElement>
                                    ) =>
                                        setNewModel({
                                            ...newModel,
                                            provider: e.target.value as any
                                        })
                                    }
                                >
                                    <option value="openrouter">
                                        OpenRouter
                                    </option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="google">Google</option>
                                    <option value="custom">
                                        Custom (OpenAI Compatible)
                                    </option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Provider Tag (Optional)
                                </Label>
                                <Input
                                    className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                                    placeholder="e.g. My Provider"
                                    value={newModel.providerName || ''}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>
                                    ) =>
                                        setNewModel({
                                            ...newModel,
                                            providerName: e.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Model ID
                                </Label>
                                <Input
                                    className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors font-mono text-sm"
                                    placeholder="e.g. openai/gpt-4-turbo-preview"
                                    value={newModel.providerId || ''}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>
                                    ) =>
                                        setNewModel({
                                            ...newModel,
                                            providerId: e.target.value
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    API Key (Optional override)
                                </Label>
                                <Input
                                    type="password"
                                    className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                                    placeholder="sk-..."
                                    value={newModel.apiKey || ''}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>
                                    ) =>
                                        setNewModel({
                                            ...newModel,
                                            apiKey: e.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Base URL (Optional)
                            </Label>
                            <Input
                                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors font-mono text-sm"
                                placeholder="https://api.example.com/v1"
                                value={newModel.baseURL || ''}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setNewModel({
                                        ...newModel,
                                        baseURL: e.target.value
                                    })
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="ghost"
                                onClick={handleCancel}
                                className="hover:bg-muted/80"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveModel}
                                className="px-8 shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px]"
                            >
                                {editingModelId ? 'Update Model' : 'Save Model'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex-1 min-h-0 border rounded-xl bg-muted/5">
                <ScrollArea className="h-full">
                    <div className="grid gap-6 p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {models.map((model) => {
                            const isActive = activeModelIds.includes(model.id)
                            return (
                                <Card
                                    key={model.id}
                                    className="group relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/40 bg-card/50 backdrop-blur-sm border-border/50 h-full"
                                >
                                    {/* Active Indicator Bar */}
                                    <div
                                        className={`absolute top-0 left-0 w-1.5 h-full transition-all duration-300 ${isActive ? 'bg-primary' : 'bg-transparent opacity-0'}`}
                                    />

                                    <div className="p-5 flex flex-col flex-1 gap-4">
                                        {/* Header Area */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20 truncate max-w-[120px]"
                                                title={
                                                    model.providerName ||
                                                    model.provider
                                                }
                                            >
                                                {model.providerName ||
                                                    model.provider}
                                            </div>
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={() =>
                                                    toggleModelActivation(
                                                        model.id
                                                    )
                                                }
                                                className="scale-90"
                                            />
                                        </div>

                                        {/* Model Info */}
                                        <div className="space-y-1.5">
                                            <h3
                                                className="font-bold text-lg leading-tight tracking-tight text-foreground/90 group-hover:text-primary transition-colors line-clamp-1"
                                                title={model.name}
                                            >
                                                {model.name}
                                            </h3>
                                            <div
                                                className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/40 inline-block max-w-full truncate"
                                                title={model.providerId}
                                            >
                                                {model.providerId}
                                            </div>
                                        </div>

                                        {/* Push content down */}
                                        <div className="flex-1" />

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-1.5 pt-4 border-t border-border/50">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex gap-1.5 items-center text-xs"
                                                onClick={() =>
                                                    handleDuplicateModel(model)
                                                }
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                                <span>Copy</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex gap-1.5 items-center text-xs"
                                                onClick={() =>
                                                    handleEditClick(model)
                                                }
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                <span>Edit</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors flex gap-1.5 items-center text-xs ml-auto"
                                                onClick={() =>
                                                    deleteModel(model.id)
                                                }
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span className="sr-only">
                                                    Delete
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

export const Component = SettingsPage
