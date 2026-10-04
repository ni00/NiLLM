import { useI18n } from '@/lib/i18n'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'

export function ConstraintsConfig({ config, onChange }: ConfigSectionProps) {
    const t = useI18n()
    return (
        <div className="space-y-6">
            <SectionHeader title={t('Constraints')} />

            <div className="grid gap-5">
                <div className="space-y-2.5">
                    <Label
                        htmlFor="maxTokens"
                        className="text-xs font-bold opacity-60 uppercase tracking-tight"
                    >
                        {t('Max Tokens')}
                    </Label>
                    <Input
                        id="maxTokens"
                        type="number"
                        step="100"
                        value={config.maxTokens ?? 100000}
                        onChange={(e) =>
                            onChange({
                                maxTokens: parseInt(e.target.value)
                            })
                        }
                        className="h-10 bg-muted/20 border-muted/50 font-mono text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                        <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                            {t('Seed')}
                        </Label>
                        <Input
                            type="number"
                            placeholder={t('Random')}
                            value={config.seed ?? ''}
                            onChange={(e) =>
                                onChange({
                                    seed: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined
                                })
                            }
                            className="h-9 bg-muted/20 border-muted/50 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                            {t('Repetition Penalty')}
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="1.0"
                            value={config.repetitionPenalty ?? ''}
                            onChange={(e) =>
                                onChange({
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
                    <Label className="text-xs font-bold opacity-60 uppercase tracking-tight">
                        {t('Stop Sequences')}
                    </Label>
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
