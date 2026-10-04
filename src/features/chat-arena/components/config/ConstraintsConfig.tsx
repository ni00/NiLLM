import { useI18n } from '@/lib/i18n'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'
import { FieldOverride } from './FieldOverride'

function optionalInt(text: string): number | undefined {
    if (!text) return undefined
    const value = parseInt(text)
    return Number.isFinite(value) ? value : undefined
}

function optionalFloat(text: string): number | undefined {
    if (!text) return undefined
    const value = parseFloat(text)
    return Number.isFinite(value) ? value : undefined
}

export function ConstraintsConfig({
    config,
    onChange,
    sources,
    onResetField
}: ConfigSectionProps) {
    const t = useI18n()
    return (
        <div className="space-y-6">
            <SectionHeader title={t('Constraints')} />

            <div className="grid gap-5">
                <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5">
                        <Label
                            htmlFor="maxTokens"
                            className="text-xs font-bold opacity-60 uppercase tracking-tight"
                        >
                            {t('Max Tokens')}
                        </Label>
                        <FieldOverride
                            path="maxTokens"
                            sources={sources}
                            onResetField={onResetField}
                        />
                    </div>
                    <Input
                        id="maxTokens"
                        type="number"
                        step="100"
                        value={config.maxTokens ?? 100000}
                        onChange={(e) =>
                            onChange({ maxTokens: optionalInt(e.target.value) })
                        }
                        className="h-10 bg-muted/20 border-muted/50 font-mono text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                                {t('Seed')}
                            </Label>
                            <FieldOverride
                                path="seed"
                                sources={sources}
                                onResetField={onResetField}
                            />
                        </div>
                        <Input
                            type="number"
                            placeholder={t('Random')}
                            value={config.seed ?? ''}
                            onChange={(e) =>
                                onChange({ seed: optionalInt(e.target.value) })
                            }
                            className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                                {t('Repetition Penalty')}
                            </Label>
                            <FieldOverride
                                path="repetitionPenalty"
                                sources={sources}
                                onResetField={onResetField}
                            />
                        </div>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="1.0"
                            value={config.repetitionPenalty ?? ''}
                            onChange={(e) =>
                                onChange({
                                    repetitionPenalty: optionalFloat(
                                        e.target.value
                                    )
                                })
                            }
                            className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                            {t('Stop Sequences')}
                        </Label>
                        <FieldOverride
                            path="stopSequences"
                            sources={sources}
                            onResetField={onResetField}
                        />
                    </div>
                    <Input
                        placeholder={'e.g. \\n, USER, END'}
                        value={config.stopSequences?.join(', ') || ''}
                        onChange={(e) =>
                            onChange({
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
    )
}
