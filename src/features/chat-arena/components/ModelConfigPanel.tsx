import React from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LLMModel } from '@/lib/types'
import { ConfigEditor } from './ConfigEditor'

export interface ModelConfigPanelProps {
    model: LLMModel
    globalConfig: any
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
        return (
            <div className="flex flex-col h-full bg-muted/5">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-bold tracking-tight">
                                    Parameters
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Override global generation settings.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] font-medium"
                                onClick={() =>
                                    onUpdateModel(model.id, {
                                        config: undefined
                                    })
                                }
                            >
                                Reset
                            </Button>
                        </div>
                        <div className="bg-muted/5 rounded-xl border p-4">
                            <ConfigEditor
                                config={{
                                    ...globalConfig,
                                    ...model.config
                                }}
                                onChange={(newConfig) =>
                                    onUpdateModel(model.id, {
                                        config: newConfig
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-muted/20">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        onClick={() => onStartEditingDetails(model)}
                    >
                        <Pencil className="w-3.5 h-3.5 mr-2" />
                        Edit Model Details
                    </Button>
                </div>
            </div>
        )
    }
)

ModelConfigPanel.displayName = 'ModelConfigPanel'
