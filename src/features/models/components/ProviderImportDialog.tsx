import { useI18n } from '@/lib/i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogHeader,
    DialogFooter,
    DialogTitle
} from '@/components/ui/dialog'
import {
    discoverModels,
    type DiscoveredModel,
    type ProviderConnection
} from '@/lib/providers/discovery'
import { providerOptions, PROVIDERS } from '@/lib/providers/catalog'
import { getModelPresets, presetCatalogInfo } from '@/lib/providers/presets'
import { buildProviderModels } from '../domain/models'
import { useAppStore } from '@/lib/store'
import type { LLMProvider } from '@/lib/types'

interface Props {
    initialConnection?: ProviderConnection
    onClose: () => void
    onAdded: (count: number) => void
}
export function ProviderImportDialog({
    initialConnection,
    onClose,
    onAdded
}: Props) {
    const t = useI18n()
    const [connection, setConnection] = useState<ProviderConnection>(
        initialConnection || { provider: 'openrouter' }
    )
    const [catalog, setCatalog] = useState<DiscoveredModel[]>([])
    const [selected, setSelected] = useState(new Set<string>())
    const [query, setQuery] = useState('')
    const [limit, setLimit] = useState(50)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [catalogSource, setCatalogSource] = useState<'preset' | 'live' | ''>(
        ''
    )
    const presets = getModelPresets(connection.provider)
    const request = useRef<AbortController | null>(null)
    useEffect(() => () => request.current?.abort(), [])
    const filtered = useMemo(
        () =>
            catalog.filter((m) =>
                `${m.id} ${m.name}`.toLowerCase().includes(query.toLowerCase())
            ),
        [catalog, query]
    )
    const change = (updates: Partial<ProviderConnection>) => {
        request.current?.abort()
        request.current = null
        setLoading(false)
        setCatalog([])
        setCatalogSource('')
        setQuery('')
        setSelected(new Set())
        setError('')
        setConnection((previous) => ({ ...previous, ...updates }))
    }
    const fetchModels = async () => {
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        setLoading(true)
        setError('')
        setCatalog([])
        setCatalogSource('')
        setSelected(new Set())
        try {
            const available = await discoverModels(
                connection,
                controller.signal
            )
            if (controller.signal.aborted) return
            setCatalog(available)
            setCatalogSource('live')
            setSelected(new Set(available.map((model) => model.id)))
            setLimit(50)
            if (!available.length)
                setError(t('This provider returned no supported models.'))
        } catch (failure) {
            if (!controller.signal.aborted)
                setError(
                    failure instanceof Error && !failure.message.includes('[')
                        ? failure.message
                        : t(
                              'Could not read the model list. Check the provider settings.'
                          )
                )
        } finally {
            if (!controller.signal.aborted) setLoading(false)
        }
    }
    const usePresets = () => {
        request.current?.abort()
        request.current = null
        setLoading(false)
        setError('')
        setQuery('')
        setLimit(50)
        setCatalog(presets)
        setCatalogSource('preset')
        setSelected(new Set(presets.map((model) => model.id)))
    }
    const addSelected = () => {
        const store = useAppStore.getState()
        const additions = buildProviderModels(
            connection,
            catalog.filter((m) => selected.has(m.id)),
            store.models
        )
        store.addModels(additions)
        onAdded(additions.length)
        onClose()
    }
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('Add provider models')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Choose built-in presets or fetch the provider’s latest models. Existing models are skipped.'
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('Provider')}</Label>
                            <SelectDropdown
                                ariaLabel={t('Provider')}
                                value={connection.provider}
                                searchable
                                options={providerOptions.map((option) => ({
                                    ...option,
                                    label: t(option.label)
                                }))}
                                onChange={(value) => {
                                    if (value === connection.provider) return
                                    change({
                                        provider: value as LLMProvider,
                                        baseURL: '',
                                        apiKey: '',
                                        providerName: ''
                                    })
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provider-name">
                                {t('Provider display name')}
                            </Label>
                            <Input
                                id="provider-name"
                                value={connection.providerName || ''}
                                placeholder={t(
                                    PROVIDERS[connection.provider].label
                                )}
                                onChange={(e) =>
                                    change({ providerName: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provider-endpoint">
                                {t('Base URL')}
                            </Label>
                            <Input
                                id="provider-endpoint"
                                value={connection.baseURL || ''}
                                placeholder={
                                    PROVIDERS[connection.provider].baseURL ||
                                    'http://localhost:11434/v1'
                                }
                                onChange={(e) =>
                                    change({ baseURL: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provider-key">{t('API key')}</Label>
                            <Input
                                id="provider-key"
                                type="password"
                                autoComplete="off"
                                value={connection.apiKey || ''}
                                onChange={(e) =>
                                    change({ apiKey: e.target.value })
                                }
                                placeholder={t(
                                    'Optional for public / local providers'
                                )}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {presets.length > 0 && (
                            <Button variant="outline" onClick={usePresets}>
                                {t('Use presets ({count})', {
                                    count: presets.length
                                })}
                            </Button>
                        )}
                        <Button
                            onClick={() => void fetchModels()}
                            disabled={loading}
                        >
                            {loading ? t('Fetching…') : t('Fetch models')}
                        </Button>
                        {loading && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    request.current?.abort()
                                    setLoading(false)
                                }}
                            >
                                {t('Cancel request')}
                            </Button>
                        )}
                    </div>
                    {catalogSource === 'preset' && (
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'Preset data: {date}. Availability and pricing may change.',
                                { date: presetCatalogInfo.checkedAt }
                            )}
                            {['ollama', 'lmstudio'].includes(
                                connection.provider
                            ) && (
                                <>
                                    {' '}
                                    {t(
                                        'Local model presets require the model to be installed first.'
                                    )}
                                </>
                            )}
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    {catalog.length > 0 && (
                        <>
                            <Input
                                aria-label={t('Search discovered models')}
                                placeholder={t('Search models…')}
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setLimit(50)
                                }}
                            />
                            <div className="flex items-center gap-3 text-sm">
                                <span>
                                    {t('{selected} / {total} selected', {
                                        selected: selected.size,
                                        total: catalog.length
                                    })}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setSelected(
                                            new Set(catalog.map((m) => m.id))
                                        )
                                    }
                                >
                                    {t('Select all')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelected(new Set())}
                                >
                                    {t('Clear selection')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        setSelected(
                                            (previous) =>
                                                new Set([
                                                    ...previous,
                                                    ...filtered.map((m) => m.id)
                                                ])
                                        )
                                    }
                                >
                                    {t('Select filtered')}
                                </Button>
                            </div>
                            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                                {filtered.slice(0, limit).map((model) => (
                                    <label
                                        key={model.id}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(model.id)}
                                            onChange={(e) =>
                                                setSelected((previous) => {
                                                    const next = new Set(
                                                        previous
                                                    )
                                                    if (e.target.checked)
                                                        next.add(model.id)
                                                    else next.delete(model.id)
                                                    return next
                                                })
                                            }
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm truncate">
                                                {model.name}
                                            </span>
                                            <span className="block text-xs text-muted-foreground truncate">
                                                {model.id} ·{' '}
                                                {t(
                                                    model.mode === 'decision'
                                                        ? 'Decision'
                                                        : model.mode === 'image'
                                                          ? 'Image'
                                                          : 'Chat'
                                                )}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {filtered.length > limit && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setLimit((n) => n + 50)}
                                >
                                    {t('Show more ({count} remaining)', {
                                        count: filtered.length - limit
                                    })}
                                </Button>
                            )}
                        </>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        disabled={!selected.size || loading}
                        onClick={addSelected}
                    >
                        {t('Add {count} models', {
                            count: selected.size || ''
                        })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
