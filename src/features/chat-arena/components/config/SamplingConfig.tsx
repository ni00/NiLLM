import { useI18n } from '@/lib/i18n'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'
import { FieldOverride } from './FieldOverride'

export function SamplingConfig({
    config,
    onChange,
    sources,
    idPrefix,
    onResetField
}: ConfigSectionProps) {
    const t = useI18n()
    return (
        <div className="space-y-6">
            <SectionHeader title={t('Sampling')} />

            <div className="grid gap-6">
                <ConfigSlider
                    label={t('Temperature')}
                    id={`${idPrefix}-temperature`}
                    value={config.temperature ?? 0.7}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ temperature: v })}
                    labels={['Precise', 'Creative']}
                    override={
                        <FieldOverride
                            path="temperature"
                            sources={sources}
                            onResetField={onResetField}
                        />
                    }
                />

                <ConfigSlider
                    label={t('Top P')}
                    id={`${idPrefix}-topP`}
                    value={config.topP ?? 0.9}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => onChange({ topP: v })}
                    labels={['Focused', 'Diverse']}
                    override={
                        <FieldOverride
                            path="topP"
                            sources={sources}
                            onResetField={onResetField}
                        />
                    }
                />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5">
                            <Label
                                htmlFor={`${idPrefix}-topK`}
                                className="text-xs font-bold opacity-60 uppercase tracking-tight"
                            >
                                {t('Top K')}
                            </Label>
                            <FieldOverride
                                path="topK"
                                sources={sources}
                                onResetField={onResetField}
                            />
                        </div>
                        <Input
                            id={`${idPrefix}-topK`}
                            type="number"
                            placeholder={t('Auto')}
                            value={config.topK ?? ''}
                            onChange={(e) =>
                                onChange({
                                    topK: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined
                                })
                            }
                            className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5">
                            <Label
                                htmlFor={`${idPrefix}-minP`}
                                className="text-xs font-bold opacity-60 uppercase tracking-tight"
                            >
                                {t('Min P')}
                            </Label>
                            <FieldOverride
                                path="minP"
                                sources={sources}
                                onResetField={onResetField}
                            />
                        </div>
                        <Input
                            id={`${idPrefix}-minP`}
                            type="number"
                            step="0.01"
                            placeholder={t('Off')}
                            value={config.minP ?? ''}
                            onChange={(e) =>
                                onChange({
                                    minP: e.target.value
                                        ? parseFloat(e.target.value)
                                        : undefined
                                })
                            }
                            className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
