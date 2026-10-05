import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Play, Loader2 } from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { LLMModel, PromptTemplate } from '@/lib/types'
import { useId } from 'react'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'

interface VariableFillerProps {
    isOpen: boolean
    template: PromptTemplate | null
    variableValues: Record<string, string>
    selectedModelId: string
    isGenerating: boolean
    feedback?: { error: boolean; message: string }
    models: LLMModel[]
    onClose: () => void
    onUse: () => void
    onAutoFill: (modelId: string) => void
    onChangeVariable: (name: string, value: string) => void
    onSelectModel: (modelId: string) => void
}

export function VariableFiller({
    isOpen,
    template,
    variableValues,
    selectedModelId,
    isGenerating,
    feedback,
    models,
    onClose,
    onUse,
    onAutoFill,
    onChangeVariable,
    onSelectModel
}: VariableFillerProps) {
    const t = useI18n()
    const idPrefix = useId()
    if (!isOpen || !template) return null

    const enabledModels = models.filter(
        (m) => m.enabled && (m.mode ?? 'chat') === 'chat'
    )

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {t('Fill Variables:')} {template.title}
                    </DialogTitle>
                    <DialogDescription>
                        {t('Manually enter values or use AI to auto-fill.')}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center">
                        {models.length === 0 ? (
                            <span className="text-xs text-destructive">
                                {t(
                                    'No models available. Add models in settings.'
                                )}
                            </span>
                        ) : (
                            <SelectDropdown
                                value={selectedModelId}
                                onChange={(val) => {
                                    onSelectModel(val)
                                    onAutoFill(val)
                                }}
                                options={enabledModels.map((m) => ({
                                    label: m.name,
                                    value: m.id,
                                    description: m.providerName || m.provider
                                }))}
                                placeholder={t('Select Model...')}
                                width={200}
                                disabled={models.length === 0 || isGenerating}
                            />
                        )}
                    </div>
                    {feedback && (
                        <p
                            role={feedback.error ? 'alert' : 'status'}
                            className="text-sm text-destructive"
                        >
                            {feedback.message}
                        </p>
                    )}

                    {template.variables.map((v) => (
                        <div key={v.name} className="space-y-1">
                            <div className="flex justify-between">
                                <Label
                                    htmlFor={`${idPrefix}-${v.name}`}
                                    className="font-mono text-xs"
                                >
                                    {v.name}
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {v.description}
                                </span>
                            </div>
                            <Textarea
                                id={`${idPrefix}-${v.name}`}
                                value={variableValues[v.name] || ''}
                                onChange={(e) =>
                                    onChangeVariable(v.name, e.target.value)
                                }
                                placeholder={t('Value for {name}…', {
                                    name: v.name
                                })}
                                className="h-20"
                            />
                        </div>
                    ))}
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={onUse}>
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4 mr-2" />
                        )}
                        {t('Fill & Use')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
