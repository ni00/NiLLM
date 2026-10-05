import type { LLMModel } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
    applyModelPreset,
    getModelPresets,
    presetCatalogInfo
} from '@/lib/providers/presets'

export function ModelPresetPicker({
    value,
    onChange
}: {
    value: Partial<LLMModel>
    onChange: (value: Partial<LLMModel>) => void
}) {
    const t = useI18n()
    const presets = getModelPresets(value.provider ?? 'openrouter')
    if (!presets.length) return null
    const selected = presets.find((preset) => preset.id === value.providerId)
    return (
        <div className="space-y-2">
            <Label>{t('Model preset')}</Label>
            <SelectDropdown
                ariaLabel={t('Model preset')}
                value={selected?.id ?? ''}
                searchable
                placeholder={t('Choose a model preset (optional)')}
                options={presets.map((preset) => ({
                    value: preset.id,
                    label: `${preset.name} · ${preset.id}`
                }))}
                onChange={(id) => {
                    const preset = presets.find(
                        (candidate) => candidate.id === id
                    )
                    if (preset) onChange(applyModelPreset(value, preset))
                }}
            />
            <p className="text-xs text-muted-foreground">
                {t(
                    'Presets fill the model ID, pricing and supported parameters. You can edit every field.'
                )}
            </p>
            {selected?.contextWindow && (
                <p className="text-xs text-muted-foreground">
                    {t('Context: {context} · Output limit: {output} tokens', {
                        context: selected.contextWindow.toLocaleString(),
                        output: selected.outputLimit?.toLocaleString() ?? '—'
                    })}
                </p>
            )}
            {selected?.config?.maxTokens && (
                <p className="text-xs text-muted-foreground">
                    {t('Initial output budget: {tokens} tokens', {
                        tokens: selected.config.maxTokens
                    })}
                </p>
            )}
            <p className="text-xs text-muted-foreground">
                {t(
                    'Preset data: {date}. Availability and pricing may change.',
                    { date: presetCatalogInfo.checkedAt }
                )}
            </p>
        </div>
    )
}
