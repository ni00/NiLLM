import { useI18n } from '@/lib/i18n'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'
import { FieldOverride } from './FieldOverride'
import type { TelemetryConfigPatch } from '@/lib/types'

export function TelemetryConfig({
    config,
    onChange,
    sources,
    onResetField
}: ConfigSectionProps) {
    const t = useI18n()
    const telemetry = config.telemetry || {
        isEnabled: false,
        recordInputs: true,
        recordOutputs: true
    }

    // Only the toggled sub-fields are emitted so inherited settings are not
    // frozen into the edited layer by a full-object write.
    const updateTelemetry = (updates: TelemetryConfigPatch) => {
        onChange({ telemetry: updates })
    }

    return (
        <div className="space-y-6 pt-4 border-t border-border/40">
            <SectionHeader title={t('Telemetry (OpenTelemetry)')} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">
                                {t('Enable Telemetry')}
                            </Label>
                            <FieldOverride
                                path="telemetry.isEnabled"
                                sources={sources}
                                onResetField={onResetField}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('Track LLM calls with OpenTelemetry')}
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
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs opacity-70">
                                    {t('Function ID')}
                                </Label>
                                <FieldOverride
                                    path="telemetry.functionId"
                                    sources={sources}
                                    onResetField={onResetField}
                                />
                            </div>
                            <Input
                                value={telemetry.functionId || ''}
                                onChange={(e) =>
                                    updateTelemetry({
                                        functionId: e.target.value
                                    })
                                }
                                placeholder={'nillm-stream'}
                                className="h-8 text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs opacity-70">
                                    {t('Record Inputs')}
                                </Label>
                                <FieldOverride
                                    path="telemetry.recordInputs"
                                    sources={sources}
                                    onResetField={onResetField}
                                />
                            </div>
                            <Switch
                                checked={telemetry.recordInputs ?? true}
                                onCheckedChange={(checked) =>
                                    updateTelemetry({ recordInputs: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs opacity-70">
                                    {t('Record Outputs')}
                                </Label>
                                <FieldOverride
                                    path="telemetry.recordOutputs"
                                    sources={sources}
                                    onResetField={onResetField}
                                />
                            </div>
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
