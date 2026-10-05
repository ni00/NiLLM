import { useI18n } from '@/lib/i18n'
import { providerOptions, PROVIDERS } from '@/lib/providers/catalog'
import { changeModelProvider } from '@/lib/providers/presets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import type { LLMModel } from '@/lib/types'
import { ModelCapabilitiesEditor } from './ModelCapabilitiesEditor'
import { DecisionProtocolEditor } from './DecisionProtocolEditor'
import { ModelPresetPicker } from './ModelPresetPicker'
import { ModelPricingEditor } from './ModelPricingEditor'
import { getReferenceModelPreset } from '@/lib/providers/presets'

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? t('Edit Model') : t('Add New Model')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('Configure your')} {modelData.provider}{' '}
                        {t('adapter settings.')}
                    </DialogDescription>
                </DialogHeader>

                <DialogBody>
                    <div className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="model-name"
                                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70"
                                >
                                    {t('Display Name')}
                                </Label>
                                <Input
                                    id="model-name"
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
                                    ariaLabel={t('Provider')}
                                    value={modelData.provider || ''}
                                    searchable
                                    onChange={(val) =>
                                        onChange(
                                            changeModelProvider(
                                                modelData,
                                                val as LLMModel['provider']
                                            )
                                        )
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
                                    ariaLabel={t('Model mode')}
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
                                            label: t('Decision'),
                                            value: 'decision'
                                        },
                                        ...(modelData.provider === 'typesafe'
                                            ? []
                                            : [
                                                  {
                                                      label: t(
                                                          'Chat Completion'
                                                      ),
                                                      value: 'chat'
                                                  },
                                                  {
                                                      label: t(
                                                          'Image Generation'
                                                      ),
                                                      value: 'image'
                                                  }
                                              ])
                                    ]}
                                />
                            </div>
                        </div>

                        <ModelPresetPicker
                            value={modelData}
                            onChange={onChange}
                        />

                        <DecisionProtocolEditor
                            value={modelData}
                            onChange={onChange}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="model-provider-id"
                                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70"
                                >
                                    {t('Model ID')}
                                </Label>
                                <Input
                                    id="model-provider-id"
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
                            <Label
                                htmlFor="model-base-url"
                                className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70"
                            >
                                {t('Base URL (Optional override)')}
                            </Label>
                            <Input
                                id="model-base-url"
                                className="h-10 border-border/50 bg-muted/20 focus:bg-background transition-all font-mono text-xs"
                                placeholder={
                                    PROVIDERS[
                                        modelData.provider ?? 'openrouter'
                                    ].baseURL || 'https://api.example.com/v1'
                                }
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
                            <Label
                                htmlFor="model-api-key"
                                className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70"
                            >
                                {t('API Key (Optional override)')}
                            </Label>
                            <Input
                                id="model-api-key"
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
                        <ModelCapabilitiesEditor
                            value={modelData.capabilities}
                            onChange={(capabilities) =>
                                onChange({ ...modelData, capabilities })
                            }
                        />
                        <ModelPricingEditor
                            key={`${modelData.provider}:${modelData.providerId ?? ''}`}
                            value={modelData.pricing}
                            reference={getReferenceModelPreset(modelData)}
                            onChange={(pricing) =>
                                onChange({ ...modelData, pricing })
                            }
                        />
                    </div>
                </DialogBody>

                <DialogFooter>
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
