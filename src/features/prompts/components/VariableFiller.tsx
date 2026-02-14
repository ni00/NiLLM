import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, Play, Loader2 } from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { LLMModel, PromptTemplate } from '@/lib/types'

interface VariableFillerProps {
    isOpen: boolean
    template: PromptTemplate | null
    variableValues: Record<string, string>
    selectedModelId: string
    isGenerating: boolean
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
    models,
    onClose,
    onUse,
    onAutoFill,
    onChangeVariable,
    onSelectModel
}: VariableFillerProps) {
    if (!isOpen || !template) return null

    const enabledModels = models.filter((m) => m.enabled)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-xl bg-card border shadow-2xl rounded-xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                    <h3 className="font-semibold">
                        Fill Variables: {template.title}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="flex justify-between gap-2 items-center">
                        <span className="text-xs text-muted-foreground italic">
                            Manually enter values or use AI to auto-fill.
                        </span>
                        {models.length === 0 ? (
                            <span className="text-xs text-destructive">
                                No models available. Add models in settings.
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
                                placeholder="Select Model..."
                                width={200}
                                disabled={models.length === 0 || isGenerating}
                            />
                        )}
                    </div>

                    {template.variables.map((v) => (
                        <div key={v.name} className="space-y-1">
                            <div className="flex justify-between">
                                <Label className="font-mono text-xs">
                                    {v.name}
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    {v.description}
                                </span>
                            </div>
                            <Textarea
                                value={variableValues[v.name] || ''}
                                onChange={(e) =>
                                    onChangeVariable(v.name, e.target.value)
                                }
                                placeholder={`Value for ${v.name}...`}
                                className="h-20"
                            />
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onUse}>
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4 mr-2" />
                        )}
                        Fill & Use
                    </Button>
                </div>
            </div>
        </div>
    )
}
