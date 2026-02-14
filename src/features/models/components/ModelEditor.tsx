import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cpu } from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import type { LLMModel } from '@/lib/types'

interface ModelEditorProps {
    isOpen: boolean
    editingId: string | null
    modelData: Partial<LLMModel>
    onClose: () => void
    onSave: () => void
    onChange: (data: Partial<LLMModel>) => void
}

const providerOptions = [
    { label: 'OpenRouter', value: 'openrouter' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'Google', value: 'google' },
    { label: 'Custom (OpenAI Compatible)', value: 'custom' }
]

export function ModelEditor({
    isOpen,
    editingId,
    modelData,
    onClose,
    onSave,
    onChange
}: ModelEditorProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-card border border-border/50 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {editingId ? 'Edit Model' : 'Add New Model'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Configure your {modelData.provider} adapter
                                settings.
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
                                    value={modelData.name || ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...modelData,
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
                                    value={modelData.provider || ''}
                                    onChange={(val) =>
                                        onChange({
                                            ...modelData,
                                            provider: val as any
                                        })
                                    }
                                    className="h-10 border-border/50 bg-muted/20 transition-all justify-between"
                                    options={providerOptions}
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
                                    value={modelData.providerId || ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...modelData,
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
                                    value={modelData.providerName || ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...modelData,
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
                                value={modelData.baseURL || ''}
                                onChange={(e) =>
                                    onChange({
                                        ...modelData,
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
                                value={modelData.apiKey || ''}
                                onChange={(e) =>
                                    onChange({
                                        ...modelData,
                                        apiKey: e.target.value
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="h-11 px-6 text-muted-foreground border border-transparent hover:border-border"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onSave}
                            className="h-11 px-10 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {editingId ? 'Update Configuration' : 'Save Model'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
