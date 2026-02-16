import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function TelemetryConfig({ config, onChange }: ConfigSectionProps) {
    const telemetry = config.telemetry || {
        isEnabled: false,
        recordInputs: true,
        recordOutputs: true
    }

    const updateTelemetry = (updates: Partial<typeof telemetry>) => {
        onChange({ telemetry: { ...telemetry, ...updates } })
    }

    return (
        <div className="space-y-6 pt-4 border-t border-border/40">
            <SectionHeader title="Telemetry (OpenTelemetry)" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-medium">
                            Enable Telemetry
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Track LLM calls with OpenTelemetry
                        </p>
                    </div>
                    <Switch
                        checked={telemetry.isEnabled}
                        onCheckedChange={(checked) =>
                            updateTelemetry({ isEnabled: checked })
                        }
                    />
                </div>

                {telemetry.isEnabled && (
                    <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                        <div className="space-y-2">
                            <Label className="text-xs opacity-70">
                                Function ID
                            </Label>
                            <Input
                                value={telemetry.functionId || ''}
                                onChange={(e) =>
                                    updateTelemetry({
                                        functionId: e.target.value
                                    })
                                }
                                placeholder="nillm-stream"
                                className="h-8 text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label className="text-xs opacity-70">
                                Record Inputs
                            </Label>
                            <Switch
                                checked={telemetry.recordInputs ?? true}
                                onCheckedChange={(checked) =>
                                    updateTelemetry({ recordInputs: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label className="text-xs opacity-70">
                                Record Outputs
                            </Label>
                            <Switch
                                checked={telemetry.recordOutputs ?? true}
                                onCheckedChange={(checked) =>
                                    updateTelemetry({ recordOutputs: checked })
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
