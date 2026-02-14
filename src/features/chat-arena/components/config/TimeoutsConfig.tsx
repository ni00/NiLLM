import { Label } from '@/components/ui/label'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function TimeoutsConfig({ config, onChange }: ConfigSectionProps) {
    return (
        <div className="space-y-6 pt-4 border-t border-border/40">
            <SectionHeader title="Timeouts (ms)" />

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                            Connect
                        </Label>
                        <span className="text-[10px] font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
                            {config.connectTimeout || 15000}
                        </span>
                    </div>
                    <ConfigSlider
                        id="connectTimeout"
                        value={config.connectTimeout || 15000}
                        min={1000}
                        max={60000}
                        step={1000}
                        onChange={(v) => onChange({ connectTimeout: v })}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                            Read
                        </Label>
                        <span className="text-[10px] font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
                            {config.readTimeout || 30000}
                        </span>
                    </div>
                    <ConfigSlider
                        id="readTimeout"
                        value={config.readTimeout || 30000}
                        min={5000}
                        max={120000}
                        step={5000}
                        onChange={(v) => onChange({ readTimeout: v })}
                    />
                </div>
            </div>
        </div>
    )
}
