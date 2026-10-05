import { useI18n } from '@/lib/i18n'
import React from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenerationConfig, GenerationConfigPatch, LLMModel } from '@/lib/types'
import {
    mergeConfigPatch,
    applyModelCapabilities,
    resetConfigField,
    resolveGenerationConfig
} from '@/features/benchmark/config'
import { ConfigEditor } from './ConfigEditor'
import { ParameterPresetControls } from './ParameterPresetControls'
export interface ModelConfigPanelProps {
    model: LLMModel
    globalConfig: GenerationConfig
    onUpdateModel: (id: string, updates: Partial<LLMModel>) => void
    onStartEditingDetails: (model: LLMModel) => void
}

export const ModelConfigPanel = React.memo(
    ({
        model,
        globalConfig,
        onUpdateModel,
        onStartEditingDetails
    }: ModelConfigPanelProps) => {
        const t = useI18n()
        const resolved = applyModelCapabilities(
            resolveGenerationConfig(globalConfig, model.config),
            model.capabilities,
            model
        )
        const patch = model.config ?? {}

        const applyPatch = (incoming: GenerationConfigPatch) => {
            const next = mergeConfigPatch(patch, incoming)
            onUpdateModel(model.id, {
                config: Object.keys(next).length > 0 ? next : undefined
            })
        }

        return (
            <div className="flex flex-col h-full bg-muted/5">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-bold tracking-tight">
                                    {t('Parameters')}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('Override global generation settings.')}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-11 text-xs font-medium"
                                onClick={() =>
                                    onUpdateModel(model.id, {
                                        config: undefined
                                    })
                                }
                            >
                                {t('Reset')}
                            </Button>
                        </div>
                        <div className="mb-4 space-y-3">
                            <ParameterPresetControls
                                config={patch}
                                onApply={applyPatch}
                            />
                            {resolved.excludedParameters.length > 0 && (
                                <p className="text-sm" role="status">
                                    {t('Parameters not sent')}:{' '}
                                    {resolved.excludedParameters.join(', ')}
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    'Undeclared capabilities are unknown; providers may ignore requested parameters.'
                                )}
                            </p>
                        </div>
                        <div className="bg-muted/5 rounded-xl border p-4">
                            <ConfigEditor
                                config={resolved.requested}
                                onChange={applyPatch}
                                sources={resolved.sources}
                                onResetField={(path) => {
                                    const next = resetConfigField(patch, path)
                                    onUpdateModel(model.id, {
                                        config:
                                            Object.keys(next).length > 0
                                                ? next
                                                : undefined
                                    })
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-muted/20">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full min-h-11 text-xs font-semibold"
                        onClick={() => onStartEditingDetails(model)}
                    >
                        <Pencil className="w-3.5 h-3.5 mr-2" />
                        {t('Edit Model Details')}
                    </Button>
                </div>
            </div>
        )
    }
)

ModelConfigPanel.displayName = 'ModelConfigPanel'
