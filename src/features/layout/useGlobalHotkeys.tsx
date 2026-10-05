import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Keyboard } from 'lucide-react'
import { APP_ROUTES } from '@/app/navigation'
import { useI18n } from '@/lib/i18n'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function isSendShortcut(event: KeyboardEvent): boolean {
    return (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'Enter' &&
        !event.shiftKey
    )
}

interface CommandEntry {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    keywords?: string
    activate: () => void
}

export function useGlobalHotkeys(): React.ReactElement | null {
    const t = useI18n()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const returnFocusRef = useRef<HTMLElement | null>(null)
    const activeCommandRef = useRef<HTMLButtonElement>(null)

    const close = useCallback(() => {
        setOpen(false)
        setQuery('')
        setActiveIndex(0)
        setShowShortcuts(false)
    }, [])

    const entries = useMemo<CommandEntry[]>(() => {
        const navEntries: CommandEntry[] = APP_ROUTES.map((route) => ({
            id: `nav:${route.path}`,
            label: t(route.labelKey),
            icon: route.icon,
            activate: () => navigate(route.path)
        }))
        return [
            ...navEntries,
            {
                id: 'action:new-experiment',
                label: t('New Experiment'),
                icon: Plus,
                keywords: 'new experiment create',
                activate: () => navigate('/experiments?new=1')
            },
            {
                id: 'action:shortcuts',
                label: t('Keyboard Shortcuts'),
                icon: Keyboard,
                keywords: 'keyboard shortcuts help',
                activate: () => setShowShortcuts((v) => !v)
            }
        ]
    }, [t, navigate])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return entries
        return entries.filter((e) =>
            `${e.label} ${e.keywords ?? ''}`.toLowerCase().includes(q)
        )
    }, [entries, query])

    useEffect(() => {
        setActiveIndex(0)
    }, [query, showShortcuts])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return
            if (event.isComposing) return
            const target = event.target as HTMLElement | null
            if (target?.closest?.('[data-no-hotkeys]')) return
            if (document.querySelector('dialog[open]')) return
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault()
                if (!open) {
                    returnFocusRef.current =
                        document.activeElement instanceof HTMLElement
                            ? document.activeElement
                            : null
                }
                setOpen((v) => !v)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open])

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    useEffect(() => {
        if (open) {
            activeCommandRef.current?.scrollIntoView({ block: 'nearest' })
        }
    }, [open, activeIndex, filtered])

    const activate = useCallback(
        (entry: CommandEntry) => {
            close()
            entry.activate()
        },
        [close]
    )

    const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((i) =>
                filtered.length ? (i + 1) % filtered.length : 0
            )
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((i) =>
                filtered.length
                    ? (i - 1 + filtered.length) % filtered.length
                    : 0
            )
        } else if (event.key === 'Enter') {
            event.preventDefault()
            const entry = filtered[activeIndex]
            if (entry) activate(entry)
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={(v) => !v && close()}>
            <DialogContent
                className="max-w-lg [&>button]:hidden"
                onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    returnFocusRef.current?.focus()
                }}
            >
                <DialogTitle className="sr-only">{t('Commands')}</DialogTitle>
                <DialogDescription className="sr-only">
                    {t('Search commands...')}
                </DialogDescription>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder={t('Search commands...')}
                    className="w-full bg-transparent px-4 sm:px-6 py-4 text-sm outline-none border-b shrink-0"
                    aria-label={t('Search commands...')}
                />
                <ul
                    className="min-h-0 max-h-72 overflow-y-auto p-2"
                    role="listbox"
                >
                    {filtered.length === 0 ? (
                        <li className="px-4 py-6 text-sm text-muted-foreground text-center">
                            {t('No matching commands')}
                        </li>
                    ) : (
                        filtered.map((entry, i) => {
                            const Icon = entry.icon
                            return (
                                <li key={entry.id}>
                                    <button
                                        type="button"
                                        ref={
                                            i === activeIndex
                                                ? activeCommandRef
                                                : undefined
                                        }
                                        role="option"
                                        aria-selected={i === activeIndex}
                                        onMouseEnter={() => setActiveIndex(i)}
                                        onClick={() => activate(entry)}
                                        className={cn(
                                            'flex min-h-11 w-full items-center gap-3 px-2 sm:px-4 py-2.5 rounded-lg text-sm text-left',
                                            i === activeIndex &&
                                                'bg-accent text-accent-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {entry.label}
                                        </span>
                                    </button>
                                </li>
                            )
                        })
                    )}
                </ul>
                {showShortcuts && (
                    <div className="border-t p-4 sm:px-6 text-sm space-y-2 shrink-0">
                        <p className="font-medium">{t('Keyboard Shortcuts')}</p>
                        <ul className="space-y-1.5 text-muted-foreground">
                            <li className="flex justify-between gap-4">
                                <span>{t('Open command menu')}</span>
                                <kbd className="text-xs">Ctrl / ⌘ + K</kbd>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>{t('Send message')}</span>
                                <kbd className="text-xs">Ctrl / ⌘ + Enter</kbd>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>{t('Close dialog')}</span>
                                <kbd className="text-xs">Esc</kbd>
                            </li>
                        </ul>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
