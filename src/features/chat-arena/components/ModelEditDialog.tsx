import { useI18n } from '@/lib/i18n'
import type { Dispatch, SetStateAction } from 'react'
import { providerOptions } from '@/lib/providers/catalog'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LLMModel } from '@/lib/types'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
    Dialog,
    DialogContent,
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
            <DialogContent className="max-w-md border-primary/20">
                <DialogHeader>
                    <DialogTitle>{t('Edit Model Details')}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                    <CardContent className="space-y-4 p-6 pb-8">
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
                                value={editForm.provider || ''}
                                onChange={(val) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        provider: val as LLMModel['provider']
                                    }))
                                }
                                options={providerOptions.map((option) => ({
                                    ...option,
                                    label: t(option.label)
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Model Mode')}</Label>
                            <SelectDropdown
                                value={editForm.mode || 'chat'}
                                onChange={(val) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        mode: val as LLMModel['mode']
                                    }))
                                }
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
                                placeholder="https://api.example.com/v1"
                            />
                        </div>
                    </CardContent>
                </ScrollArea>
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
