import { useI18n } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'
import { GenerationConfig, GlobalConfigUpdate } from '@/lib/types'
import { ConfigEditor } from './ConfigEditor'
import { ParameterPresetControls } from './ParameterPresetControls'

export interface ArenaGlobalParamsProps {
    config: GenerationConfig
    onChange: (updates: GlobalConfigUpdate) => void
}

export const ArenaGlobalParams = React.memo(
    ({ config, onChange }: ArenaGlobalParamsProps) => {
        const t = useI18n()
        const presetConfig = { ...config }
        delete presetConfig.maxConcurrent
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                        {t('Generation Parameters')}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        {t('Adjust sampling and length constraints globally.')}
                    </p>
                </div>
                <ParameterPresetControls
                    config={presetConfig}
                    onApply={onChange}
                />
                <div className="space-y-2 rounded-xl border p-4">
                    <Label htmlFor="max-concurrent">
                        {t('Concurrent models')}
                    </Label>
                    <Input
                        id="max-concurrent"
                        type="number"
                        min={1}
                        max={16}
                        value={config.maxConcurrent ?? 4}
                        onChange={(event) => {
                            const value = Number(event.target.value)
                            if (
                                Number.isInteger(value) &&
                                value >= 1 &&
                                value <= 16
                            )
                                onChange({ maxConcurrent: value })
                        }}
                        className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Run up to this many models at once; remaining models wait for a free slot.'
                        )}
                    </p>
                </div>
                <div className="p-4 border rounded-xl bg-muted/5">
                    <ConfigEditor
                        config={config}
                        onChange={onChange}
                        onResetField={(path) => {
                            const [group, field] = path.split('.')
                            if (
                                (group === 'timeout' ||
                                    group === 'telemetry') &&
                                field
                            ) {
                                onChange({ [group]: { [field]: undefined } })
                            } else {
                                onChange({ [path]: undefined })
                            }
                        }}
                    />
                </div>
            </div>
        )
    }
)

ArenaGlobalParams.displayName = 'ArenaGlobalParams'
