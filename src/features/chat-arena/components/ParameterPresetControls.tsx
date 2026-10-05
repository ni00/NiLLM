import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import type { GenerationConfigPatch } from '@/lib/types'

export interface ParameterPresetControlsProps {
    config: GenerationConfigPatch
    onApply: (patch: GenerationConfigPatch) => void
}

function fields(config: GenerationConfigPatch): [string, unknown][] {
    return Object.entries(config).flatMap(([key, value]) => {
        if (value === undefined) return []
        if (
            (key === 'timeout' || key === 'telemetry') &&
            value &&
            typeof value === 'object'
        ) {
            return Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .map(
                    ([field, item]) =>
                        [`${key}.${field}`, item] as [string, unknown]
                )
        }
        return [[key, value] as [string, unknown]]
    })
}

export function ParameterPresetControls({
    config,
    onApply
}: ParameterPresetControlsProps) {
    const t = useI18n()
    const id = useId()
    const presets = useAppStore((state) => state.parameterPresets)
    const save = useAppStore((state) => state.saveParameterPreset)
    const remove = useAppStore((state) => state.deleteParameterPreset)
    const [selectedId, setSelectedId] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [preview, setPreview] = useState<GenerationConfigPatch | null>(null)
    const selected = presets.find((preset) => preset.id === selectedId)
    const current = new Map(fields(config))
    const changes = preview
        ? fields(preview).filter(
              ([key, value]) =>
                  JSON.stringify(current.get(key)) !== JSON.stringify(value)
          )
        : []
    const persist = (mode: 'new' | 'rename' | 'update') => {
        try {
            if (!name.trim()) throw new Error(t('Preset name is required.'))
            if (mode !== 'new' && !selected) return
            const now = Date.now()
            save({
                id: mode === 'new' ? crypto.randomUUID() : selected!.id,
                name,
                config: mode === 'rename' ? selected!.config : config,
                createdAt: mode === 'new' ? now : selected!.createdAt,
                updatedAt: now
            })
            setError('')
        } catch {
            setError(
                t('Enter a non-empty preset name and valid parameter values.')
            )
        }
    }
    return (
        <section className="space-y-3 rounded-lg border p-4">
            <Label htmlFor={`${id}-select`}>{t('Parameter presets')}</Label>
            <select
                id={`${id}-select`}
                className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedId}
                onChange={(event) => {
                    const preset = presets.find(
                        (item) => item.id === event.target.value
                    )
                    setSelectedId(event.target.value)
                    setName(preset?.name ?? '')
                    setError('')
                }}
            >
                <option value="">{t('Select a parameter preset')}</option>
                {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                        {preset.name} · {preset.id}
                    </option>
                ))}
            </select>
            <Label htmlFor={`${id}-name`}>{t('Preset name')}</Label>
            <Input
                id={`${id}-name`}
                className="min-h-11"
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    className="min-h-11"
                    variant="outline"
                    onClick={() => persist('new')}
                >
                    {t('Save current patch')}
                </Button>
                <Button
                    className="min-h-11"
                    variant="outline"
                    disabled={!selected}
                    onClick={() => persist('rename')}
                >
                    {t('Rename preset')}
                </Button>
                <Button
                    className="min-h-11"
                    variant="outline"
                    disabled={!selected}
                    onClick={() => persist('update')}
                >
                    {t('Update from current patch')}
                </Button>
                <Button
                    className="min-h-11"
                    disabled={!selected}
                    onClick={() => {
                        setError('')
                        setPreview(structuredClone(selected!.config))
                    }}
                >
                    {t('Preview preset')}
                </Button>
                <Button
                    className="min-h-11"
                    variant="outline"
                    disabled={!selected}
                    onClick={() => {
                        remove(selected!.id)
                        setSelectedId('')
                        setName('')
                        setError('')
                    }}
                >
                    {t('Delete preset')}
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">
                {t(
                    'Presets copy parameter overrides; omitted fields remain unchanged.'
                )}
            </p>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <Dialog
                open={preview !== null}
                onOpenChange={(open) => {
                    if (!open) setPreview(null)
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Preview preset')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Review changed fields before applying a copied patch.'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        {changes.length ? (
                            <dl className="space-y-3 text-sm">
                                {changes.map(([key, value]) => (
                                    <div key={key}>
                                        <dt className="font-medium">{key}</dt>
                                        <dd className="break-all whitespace-pre-wrap">
                                            {JSON.stringify(current.get(key)) ??
                                                t('Inherited')}{' '}
                                            → {JSON.stringify(value)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        ) : (
                            <p className="text-sm">
                                {t('No parameter values will change.')}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setPreview(null)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            className="min-h-11"
                            onClick={() => {
                                try {
                                    onApply(structuredClone(preview!))
                                    setPreview(null)
                                    setError('')
                                } catch {
                                    setError(
                                        t('Unable to apply parameter preset.')
                                    )
                                    setPreview(null)
                                }
                            }}
                        >
                            {t('Apply preset')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    )
}
