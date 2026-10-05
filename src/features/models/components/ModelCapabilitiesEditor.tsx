import { useId } from 'react'
import { useI18n } from '@/lib/i18n'
import { SAMPLING_PARAMETERS, type LLMModel } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/ui/select-dropdown'

interface ModelCapabilitiesEditorProps {
    value: LLMModel['capabilities']
    onChange: (value: LLMModel['capabilities']) => void
}

export function ModelCapabilitiesEditor({
    value,
    onChange
}: ModelCapabilitiesEditorProps) {
    const t = useI18n()
    const id = useId()
    const update = (next: NonNullable<LLMModel['capabilities']>) => {
        if (!next.unsupportedParameters?.length)
            delete next.unsupportedParameters
        onChange(Object.keys(next).length ? next : undefined)
    }
    return (
        <fieldset className="min-w-0 space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
                {t('Model capabilities')}
            </legend>
            <div className="space-y-2">
                <Label>{t('Image input support')}</Label>
                <SelectDropdown
                    value={
                        value?.vision === undefined
                            ? 'unknown'
                            : value.vision
                              ? 'supported'
                              : 'unsupported'
                    }
                    className="min-h-11 w-full"
                    options={[
                        { value: 'unknown', label: t('Unknown (unverified)') },
                        { value: 'supported', label: t('Supported') },
                        { value: 'unsupported', label: t('Not supported') }
                    ]}
                    onChange={(selection) => {
                        const next = { ...value }
                        if (selection === 'unknown') delete next.vision
                        else next.vision = selection === 'supported'
                        update(next)
                    }}
                />
            </div>
            <p className="text-sm text-muted-foreground">
                {t(
                    'Unknown capabilities are unverified; parameters are sent and the provider may ignore them.'
                )}
            </p>
            <p className="text-sm font-medium">
                {t('Unsupported sampling parameters')}
            </p>
            <p className="text-sm text-muted-foreground">
                {t(
                    'Declared unsupported parameters are omitted from requests; requested values remain recorded.'
                )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                {SAMPLING_PARAMETERS.map((parameter) => (
                    <Label
                        key={parameter}
                        htmlFor={`${id}-${parameter}`}
                        className="flex min-h-11 min-w-0 items-center gap-3 text-sm"
                    >
                        <input
                            id={`${id}-${parameter}`}
                            type="checkbox"
                            className="size-4 shrink-0 accent-primary"
                            checked={
                                value?.unsupportedParameters?.includes(
                                    parameter
                                ) ?? false
                            }
                            onChange={(event) =>
                                update({
                                    ...value,
                                    unsupportedParameters:
                                        SAMPLING_PARAMETERS.filter(
                                            (candidate) =>
                                                candidate === parameter
                                                    ? event.target.checked
                                                    : value?.unsupportedParameters?.includes(
                                                          candidate
                                                      )
                                        )
                                })
                            }
                        />
                        <span className="break-all">{parameter}</span>
                    </Label>
                ))}
            </div>
        </fieldset>
    )
}
