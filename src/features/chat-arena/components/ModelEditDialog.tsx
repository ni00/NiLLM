import { useI18n } from '@/lib/i18n'
import type { Dispatch, SetStateAction } from 'react'
import { providerOptions, PROVIDERS } from '@/lib/providers/catalog'
import { changeModelProvider } from '@/lib/providers/presets'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LLMModel } from '@/lib/types'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { ModelCapabilitiesEditor } from '@/features/models/components/ModelCapabilitiesEditor'
import { DecisionProtocolEditor } from '@/features/models/components/DecisionProtocolEditor'
import { ModelPresetPicker } from '@/features/models/components/ModelPresetPicker'
import { ModelPricingEditor } from '@/features/models/components/ModelPricingEditor'
import { getReferenceModelPreset } from '@/lib/providers/presets'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'

interface ModelEditDialogProps {
    editForm: Partial<LLMModel>
    setEditForm: Dispatch<SetStateAction<Partial<LLMModel>>>
    onClose: () => void
    onSave: () => void
}

export const ModelEditDialog = ({
    editForm,
    setEditForm,
    onClose,
    onSave
}: ModelEditDialogProps) => {
    const t = useI18n()
    return (
        <Dialog open={!!editForm} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Edit Model Details')}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Display Name')}</Label>
                            <Input
                                value={editForm.name || ''}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        name: e.target.value
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Provider Type')}</Label>
                            <SelectDropdown
                                ariaLabel={t('Provider')}
                                value={editForm.provider || ''}
                                searchable
                                onChange={(val) =>
                                    setEditForm((prev) =>
                                        changeModelProvider(
                                            prev,
                                            val as LLMModel['provider']
                                        )
                                    )
                                }
                                options={providerOptions.map((option) => ({
                                    ...option,
                                    label: t(option.label)
                                }))}
                            />
                        </div>
                        <ModelPresetPicker
                            value={editForm}
                            onChange={setEditForm}
                        />
                        <div className="space-y-2">
                            <Label>{t('Model Mode')}</Label>
                            <SelectDropdown
                                ariaLabel={t('Model mode')}
                                value={editForm.mode || 'chat'}
                                onChange={(val) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        mode: val as LLMModel['mode']
                                    }))
                                }
                                options={[
                                    { label: t('Decision'), value: 'decision' },
                                    ...(editForm.provider === 'typesafe'
                                        ? []
                                        : [
                                              {
                                                  label: t('Chat Completion'),
                                                  value: 'chat'
                                              },
                                              {
                                                  label: t('Image Generation'),
                                                  value: 'image'
                                              }
                                          ])
                                ]}
                            />
                        </div>
                        <DecisionProtocolEditor
                            value={editForm}
                            onChange={setEditForm}
                        />
                        <div className="space-y-2">
                            <Label>{t('Provider Tag (Optional)')}</Label>
                            <Input
                                placeholder={t('Display name on card')}
                                value={editForm.providerName || ''}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        providerName: e.target.value
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Model ID')}</Label>
                            <Input
                                value={editForm.providerId || ''}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        providerId: e.target.value
                                    }))
                                }
                                placeholder={'e.g. openai/gpt-4'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('API Key (Optional)')}</Label>
                            <Input
                                type="password"
                                value={editForm.apiKey || ''}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        apiKey: e.target.value
                                    }))
                                }
                                placeholder={t('Leave empty to use global')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Base URL (Optional)')}</Label>
                            <Input
                                value={editForm.baseURL || ''}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        baseURL: e.target.value
                                    }))
                                }
                                placeholder={
                                    PROVIDERS[editForm.provider ?? 'openrouter']
                                        .baseURL || 'https://api.example.com/v1'
                                }
                            />
                        </div>
                        <ModelCapabilitiesEditor
                            value={editForm.capabilities}
                            onChange={(capabilities) =>
                                setEditForm((prev) => ({
                                    ...prev,
                                    capabilities
                                }))
                            }
                        />
                        <ModelPricingEditor
                            key={`${editForm.provider}:${editForm.providerId ?? ''}`}
                            value={editForm.pricing}
                            reference={getReferenceModelPreset(editForm)}
                            onChange={(pricing) =>
                                setEditForm((previous) => ({
                                    ...previous,
                                    pricing
                                }))
                            }
                        />
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={onSave} className="shadow-sm">
                        {t('Save Changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
