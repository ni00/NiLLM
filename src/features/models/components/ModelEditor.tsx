import { useI18n } from '@/lib/i18n'
import { providerOptions } from '@/lib/providers/catalog'
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

export function ModelEditor({
    isOpen,
    editingId,
    modelData,
    onClose,
    onSave,
    onChange
}: ModelEditorProps) {
    const t = useI18n()
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] bg-card border border-border/50 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                {/* Fixed Header */}
                <div className="p-6 pb-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {editingId
                                    ? t('Edit Model')
                                    : t('Add New Model')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('Configure your')} {modelData.provider}{' '}
                                {t('adapter settings.')}
                            </p>
                        </div>
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <Cpu className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6">
                    <div className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                    {t('Display Name')}
                                </Label>
                                <Input
                                    className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all"
                                    placeholder={t('e.g. GPT-4 Turbo')}
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
                                    {t('Provider')}
                                </Label>
                                <SelectDropdown
                                    value={modelData.provider || ''}
                                    onChange={(val) =>
                                        onChange({
                                            ...modelData,
                                            provider:
                                                val as LLMModel['provider']
                                        })
                                    }
                                    className="h-10 border-border/50 bg-muted/20 transition-all justify-between"
                                    options={providerOptions.map((option) => ({
                                        ...option,
                                        label: t(option.label)
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                    {t('Mode')}
                                </Label>
                                <SelectDropdown
                                    value={modelData.mode || 'chat'}
                                    onChange={(val) =>
                                        onChange({
                                            ...modelData,
                                            mode: val as LLMModel['mode']
                                        })
                                    }
                                    className="h-10 border-border/50 bg-muted/20 transition-all justify-between"
                                    options={[
                                        {
                                            label: t('Chat Completion'),
                                            value: 'chat'
                                        },
                                        {
                                            label: t('Image Generation'),
                                            value: 'image'
                                        }
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                    {t('Model ID')}
                                </Label>
                                <Input
                                    className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all font-mono text-xs"
                                    placeholder={'e.g. openai/gpt-4'}
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
                                    {t('Provider Tag (Optional)')}
                                </Label>
                                <Input
                                    className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all"
                                    placeholder={t('e.g. DeepSeek')}
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
                                {t('Base URL (Optional override)')}
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
                                {t('API Key (Optional override)')}
                            </Label>
                            <Input
                                type="password"
                                className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all"
                                placeholder={'sk-...'}
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
                </div>

                {/* Fixed Footer */}
                <div className="p-6 pt-4 flex justify-end gap-3 flex-shrink-0 border-t border-border/30">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="h-11 px-6 text-muted-foreground border border-transparent hover:border-border"
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        onClick={onSave}
                        className="h-11 px-10 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {editingId
                            ? t('Update Configuration')
                            : t('Save Model')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
