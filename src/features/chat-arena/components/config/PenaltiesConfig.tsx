import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function PenaltiesConfig({ config, onChange }: ConfigSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader title="Penalties" />

            <div className="grid gap-6">
                <ConfigSlider
                    label="Frequency Penalty"
                    id="freqP"
                    value={config.frequencyPenalty ?? 0}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ frequencyPenalty: v })}
                />
                <ConfigSlider
                    label="Presence Penalty"
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
