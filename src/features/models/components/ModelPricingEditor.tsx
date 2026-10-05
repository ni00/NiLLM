import { useEffect, useId, useRef, useState } from 'react'
import type { ModelPricing } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { nonnegativeNumber } from '@/lib/usage'
import type { ModelPreset } from '@/lib/providers/presets'

const fields = {
    input: 'Input price',
    output: 'Output price',
    cacheRead: 'Cache read price',
    cacheWrite: 'Cache write price'
} as const
const draftFor = (value?: ModelPricing) =>
    Object.fromEntries(
        Object.keys(fields).map((field) => [
            field,
            value?.[field as keyof ModelPricing]?.toString() ?? ''
        ])
    ) as Record<keyof ModelPricing, string>

export function ModelPricingEditor({
    value,
    reference,
    onChange
}: {
    value?: ModelPricing
    reference?: ModelPreset
    onChange: (value: ModelPricing | undefined) => void
}) {
    const t = useI18n(),
        id = useId()
    const [draft, setDraft] = useState(() => draftFor(value))
    const emitted = useRef(value)
    useEffect(() => {
        if (emitted.current === value) return
        emitted.current = value
        setDraft(draftFor(value))
    }, [value])
    const update = (next: typeof draft) => {
        setDraft(next)
        const parsed = Object.fromEntries(
            Object.entries(next).map(([key, text]) => [
                key,
                text.trim() === '' ? undefined : nonnegativeNumber(Number(text))
            ])
        )
        const valid = Object.entries(next).every(
            ([key, text]) => text.trim() === '' || parsed[key] !== undefined
        )
        const price =
            valid && parsed.input !== undefined && parsed.output !== undefined
                ? {
                      input: parsed.input,
                      output: parsed.output,
                      ...(parsed.cacheRead !== undefined && {
                          cacheRead: parsed.cacheRead
                      }),
                      ...(parsed.cacheWrite !== undefined && {
                          cacheWrite: parsed.cacheWrite
                      })
                  }
                : undefined
        emitted.current = price
        onChange(price)
    }
    return (
        <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
                {t('Token prices (USD / 1M tokens)')}
            </legend>
            <p className="text-xs text-muted-foreground">
                {t(
                    'Used when the provider does not report cost. Leave optional cache prices blank to use the input price.'
                )}
            </p>
            {!value && reference?.pricing && (
                <p className="text-xs text-muted-foreground">
                    {t(
                        'Blank prices use the built-in reference prices for this model. Enter prices to override them.'
                    )}
                    {reference.pricingNote && <> {t(reference.pricingNote)}</>}
                </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(fields) as Array<keyof ModelPricing>).map(
                    (field) => (
                        <div className="space-y-1" key={field}>
                            <Label htmlFor={`${id}-${field}`}>
                                {t(fields[field])}
                            </Label>
                            <Input
                                id={`${id}-${field}`}
                                type="number"
                                min="0"
                                step="any"
                                value={draft[field]}
                                placeholder={
                                    reference?.pricing?.[field] !== undefined
                                        ? t('Auto: {price}', {
                                              price: reference.pricing[field]!
                                          })
                                        : t('Unknown')
                                }
                                onChange={(event) =>
                                    update({
                                        ...draft,
                                        [field]: event.target.value
                                    })
                                }
                            />
                        </div>
                    )
                )}
            </div>
            {Object.values(draft).some((text) => text !== '') &&
                (!value ||
                    Object.values(draft).some(
                        (text) =>
                            text !== '' &&
                            nonnegativeNumber(Number(text)) === undefined
                    )) && (
                    <p role="status" className="text-xs text-muted-foreground">
                        {t(
                            'Fill both input and output prices with nonnegative numbers to estimate cost.'
                        )}
                    </p>
                )}
            {Object.values(draft).some((text) => text !== '') && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update(draftFor())}
                >
                    {t('Clear prices')}
                </Button>
            )}
        </fieldset>
    )
}
