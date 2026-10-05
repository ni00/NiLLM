import { useI18n } from '@/lib/i18n'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'
import { FieldOverride } from './FieldOverride'

export function PenaltiesConfig({
    config,
    onChange,
    sources,
    idPrefix,
    onResetField
}: ConfigSectionProps) {
    const t = useI18n()
    return (
        <div className="space-y-6">
            <SectionHeader title={t('Penalties')} />

            <div className="grid gap-6">
                <ConfigSlider
                    label={t('Frequency Penalty')}
                    id={`${idPrefix}-frequencyPenalty`}
                    value={config.frequencyPenalty ?? 0}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ frequencyPenalty: v })}
                    override={
                        <FieldOverride
                            path="frequencyPenalty"
                            sources={sources}
                            onResetField={onResetField}
                        />
                    }
                />
                <ConfigSlider
                    label={t('Presence Penalty')}
                    id={`${idPrefix}-presencePenalty`}
                    value={config.presencePenalty ?? 0}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ presencePenalty: v })}
                    override={
                        <FieldOverride
                            path="presencePenalty"
                            sources={sources}
                            onResetField={onResetField}
                        />
                    }
                />
            </div>
        </div>
    )
}
