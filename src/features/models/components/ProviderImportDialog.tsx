import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    discoverModels,
    type DiscoveredModel,
    type ProviderConnection
} from '@/lib/providers/discovery'
import { providerOptions, PROVIDERS } from '@/lib/providers/catalog'
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
    const [connection, setConnection] = useState<ProviderConnection>(
        initialConnection || { provider: 'openrouter' }
    )
    const [catalog, setCatalog] = useState<DiscoveredModel[]>([])
    const [selected, setSelected] = useState(new Set<string>())
    const [query, setQuery] = useState('')
    const [limit, setLimit] = useState(50)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
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
        setSelected(new Set())
        try {
            const available = await discoverModels(
                connection,
                controller.signal
            )
            if (controller.signal.aborted) return
            setCatalog(available)
            setSelected(new Set(available.map((model) => model.id)))
            setLimit(50)
            if (!available.length)
                setError('This provider returned no supported models.')
        } catch (failure) {
            if (!controller.signal.aborted)
                setError(
                    failure instanceof Error && !failure.message.includes('[')
                        ? failure.message
                        : 'Could not read the model list. Check the provider settings.'
                )
        } finally {
            if (!controller.signal.aborted) setLoading(false)
        }
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
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto gap-4 p-4 sm:p-6">
                <DialogHeader className="p-0 pb-3 pr-6">
                    <DialogTitle>Add provider models</DialogTitle>
                    <DialogDescription>
                        Fetch the provider’s model list and add all models at
                        once. Existing models are skipped.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <SelectDropdown
                            ariaLabel="Provider"
                            value={connection.provider}
                            options={providerOptions}
                            onChange={(value) =>
                                change({
                                    provider: value as LLMProvider,
                                    baseURL: ''
                                })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="provider-name">
                            Provider display name
                        </Label>
                        <Input
                            id="provider-name"
                            value={connection.providerName || ''}
                            placeholder={PROVIDERS[connection.provider].label}
                            onChange={(e) =>
                                change({ providerName: e.target.value })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="provider-endpoint">Base URL</Label>
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
                        <Label htmlFor="provider-key">API key</Label>
                        <Input
                            id="provider-key"
                            type="password"
                            autoComplete="off"
                            value={connection.apiKey || ''}
                            onChange={(e) => change({ apiKey: e.target.value })}
                            placeholder="Optional for public / local providers"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => void fetchModels()}
                        disabled={loading}
                    >
                        {loading ? 'Fetching…' : 'Fetch models'}
                    </Button>
                    {loading && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                request.current?.abort()
                                setLoading(false)
                            }}
                        >
                            Cancel request
                        </Button>
                    )}
                </div>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                {catalog.length > 0 && (
                    <>
                        <Input
                            aria-label="Search discovered models"
                            placeholder="Search models…"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setLimit(50)
                            }}
                        />
                        <div className="flex items-center gap-3 text-sm">
                            <span>
                                {selected.size} / {catalog.length} selected
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
                                Select all
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelected(new Set())}
                            >
                                Clear selection
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
                                Select filtered
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
                                                const next = new Set(previous)
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
                                            {model.id} · {model.mode}
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
                                Show more ({filtered.length - limit} remaining)
                            </Button>
                        )}
                    </>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        disabled={!selected.size || loading}
                        onClick={addSelected}
                    >
                        Add {selected.size || ''} models
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
