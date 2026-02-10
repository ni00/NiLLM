import { GenerationConfig } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ConfigSlider } from './ConfigSlider'

interface ConfigEditorProps {
    config: GenerationConfig
    onChange: (c: GenerationConfig) => void
}

export const ConfigEditor = ({ config, onChange }: ConfigEditorProps) => {
    const handleUpdate = (updates: Partial<GenerationConfig>) => {
        onChange({ ...config, ...updates })
    }

    const SectionHeader = ({ title }: { title: string }) => (
        <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-2 whitespace-nowrap">
                {title}
            </span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    )

    return (
        <div className="grid gap-10 py-2">
            {/* SECTION: Sampling */}
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
                        onChange={(v) => handleUpdate({ temperature: v })}
                        labels={['Precise', 'Creative']}
                    />

                    <ConfigSlider
                        label="Top P"
                        id="topP"
                        value={config.topP ?? 0.9}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(v) => handleUpdate({ topP: v })}
                        labels={['Focused', 'Diverse']}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2.5">
                            <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                                Top K
                            </Label>
                            <Input
                                type="number"
                                placeholder="Auto"
                                value={config.topK ?? ''}
                                onChange={(e) =>
                                    handleUpdate({
                                        topK: e.target.value
                                            ? parseInt(e.target.value)
                                            : undefined
                                    })
                                }
                                className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                                Min P
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Off"
                                value={config.minP ?? ''}
                                onChange={(e) =>
                                    handleUpdate({
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

            {/* SECTION: Penalties */}
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
                        onChange={(v) => handleUpdate({ frequencyPenalty: v })}
                    />
                    <ConfigSlider
                        label="Presence Penalty"
                        id="presP"
                        value={config.presencePenalty ?? 0}
                        min={-2}
                        max={2}
                        step={0.1}
                        onChange={(v) => handleUpdate({ presencePenalty: v })}
                    />
                </div>
            </div>

            {/* SECTION: Context & Constraints */}
            <div className="space-y-6">
                <SectionHeader title="Constraints" />

                <div className="grid gap-5">
                    <div className="space-y-2.5">
                        <Label
                            htmlFor="maxTokens"
                            className="text-[11px] font-bold opacity-60 uppercase tracking-tight"
                        >
                            Max Tokens
                        </Label>
                        <Input
                            id="maxTokens"
                            type="number"
                            step="100"
                            value={config.maxTokens ?? 100000}
                            onChange={(e) =>
                                handleUpdate({
                                    maxTokens: parseInt(e.target.value)
                                })
                            }
                            className="h-10 bg-muted/20 border-muted/50 font-mono text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2.5">
                            <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                                Seed
                            </Label>
                            <Input
                                type="number"
                                placeholder="Random"
                                value={config.seed ?? ''}
                                onChange={(e) =>
                                    handleUpdate({
                                        seed: e.target.value
                                            ? parseInt(e.target.value)
                                            : undefined
                                    })
                                }
                                className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                                Repetition Penalty
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="1.0"
                                value={config.repetitionPenalty ?? ''}
                                onChange={(e) =>
                                    handleUpdate({
                                        repetitionPenalty: e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined
                                    })
                                }
                                className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-[11px] font-bold opacity-60 uppercase tracking-tight">
                            Stop Sequences
                        </Label>
                        <Input
                            placeholder="e.g. \n, USER, END"
                            value={config.stopSequences?.join(', ') || ''}
                            onChange={(e) =>
                                handleUpdate({
                                    stopSequences: e.target.value
                                        ? e.target.value
                                              .split(',')
                                              .map((s) => s.trim())
                                              .filter(Boolean)
                                        : undefined
                                })
                            }
                            className="h-10 bg-muted/20 border-muted/50 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* SECTION: Connection & Timeout */}
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
                            onChange={(v) =>
                                handleUpdate({ connectTimeout: v })
                            }
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
                            onChange={(v) => handleUpdate({ readTimeout: v })}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
