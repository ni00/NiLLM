import { useI18n } from '@/lib/i18n'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function PenaltiesConfig({ config, onChange }: ConfigSectionProps) {
    const t = useI18n()
    return (
        <div className="space-y-6">
            <SectionHeader title={t('Penalties')} />

            <div className="grid gap-6">
                <ConfigSlider
                    label={t('Frequency Penalty')}
                    id="freqP"
                    value={config.frequencyPenalty ?? 0}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ frequencyPenalty: v })}
                />
                <ConfigSlider
                    label={t('Presence Penalty')}
                    id="presP"
                    value={config.presencePenalty ?? 0}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ presencePenalty: v })}
                />
            </div>
        </div>
    )
}
