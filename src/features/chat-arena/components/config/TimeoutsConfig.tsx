import { Label } from '@/components/ui/label'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function TimeoutsConfig({ config, onChange }: ConfigSectionProps) {
    const timeout = config.timeout || {}

    const updateTimeout = (updates: Partial<typeof timeout>) => {
        onChange({ timeout: { ...timeout, ...updates } })
    }

    return (
        <div className="space-y-6 pt-4 border-t border-border/40">
            <SectionHeader title="Timeouts (ms)" />

            {/* AI SDK Native Timeouts */}
            <div className="space-y-4">
                <div className="text-xs font-bold opacity-60 uppercase tracking-tight">
                    AI SDK Timeouts
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs opacity-70">Total</Label>
                            <span className="text-xs font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
                                {timeout.totalMs || 120000}
                            </span>
                        </div>
                        <ConfigSlider
                            id="timeout.totalMs"
                            value={timeout.totalMs || 120000}
                            min={10000}
                            max={300000}
                            step={10000}
                            onChange={(v) => updateTimeout({ totalMs: v })}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs opacity-70">Step</Label>
                            <span className="text-xs font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
                                {timeout.stepMs || 60000}
                            </span>
                        </div>
                        <ConfigSlider
                            id="timeout.stepMs"
                            value={timeout.stepMs || 60000}
                            min={5000}
                            max={180000}
                            step={5000}
                            onChange={(v) => updateTimeout({ stepMs: v })}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs opacity-70">Chunk</Label>
                            <span className="text-xs font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
                                {timeout.chunkMs || 10000}
                            </span>
                        </div>
                        <ConfigSlider
                            id="timeout.chunkMs"
                            value={timeout.chunkMs || 10000}
                            min={1000}
                            max={60000}
                            step={1000}
                            onChange={(v) => updateTimeout({ chunkMs: v })}
                        />
                    </div>
                </div>
            </div>

            {/* Legacy Timeouts (engine.ts fallback) */}
            <div className="space-y-4 opacity-60">
                <div className="text-xs font-bold opacity-60 uppercase tracking-tight">
                    Legacy (Fallback)
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs opacity-70">
                                Connect
                            </Label>
                            <span className="text-xs font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
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
                            <Label className="text-xs opacity-70">Read</Label>
                            <span className="text-xs font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded opacity-70">
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
        </div>
    )
}
