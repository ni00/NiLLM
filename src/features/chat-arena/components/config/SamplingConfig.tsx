import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function SamplingConfig({ config, onChange }: ConfigSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader title="Sampling" />

            <div className="grid gap-6">
                <ConfigSlider
                    label="Temperature"
                    id="temp"
                    value={config.temperature ?? 0.7}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={(v) => onChange({ temperature: v })}
                    labels={['Precise', 'Creative']}
                />

                <ConfigSlider
                    label="Top P"
                    id="topP"
                    value={config.topP ?? 0.9}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => onChange({ topP: v })}
                    labels={['Focused', 'Diverse']}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                        <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                            Top K
                        </Label>
                        <Input
                            type="number"
                            placeholder="Auto"
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
                        <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                            Min P
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="Off"
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
