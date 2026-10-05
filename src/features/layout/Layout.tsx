import { useI18n } from '@/lib/i18n'
import { Outlet, Link, useLocation } from 'react-router'
import { useState } from 'react'
import { Menu, RotateCcw, FileDown, Loader2, Square } from 'lucide-react'
import { useAppPreferences } from '@/features/settings/useAppPreferences'
import { useGlobalHotkeys } from '@/features/layout/useGlobalHotkeys'
import { useQueueProcessor } from '@/features/chat-arena/hooks/useQueueProcessor'
import { usePageVisibility } from '@/lib/hooks/usePageVisibility'
import {
    pauseStreamingUI,
    resumeStreamingUI
} from '@/features/benchmark/streaming-ui'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { APP_ROUTES } from '@/app/navigation'
import { cn } from '@/lib/utils'

function StorageFailureBanner() {
    const t = useI18n()
    const persistenceState = useAppStore((s) => s.persistenceState)
    const persistenceError = useAppStore((s) => s.persistenceError)
    const retry = useAppStore((s) => s.retryPersistence)
    const dump = useAppStore((s) => s.downloadStorageDump)
    if (persistenceState !== 'error' || !persistenceError) return null
    const isRead = persistenceError.operation === 'read'
    return (
        <div
            role="alert"
            className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
        >
            <span className="flex-1 truncate">
                {isRead
                    ? t(
                          'Failed to load saved data. Your records are intact but saving is disabled.'
                      )
                    : t(
                          'Saving failed. Recent changes are kept in memory only.'
                      )}
            </span>
            <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={retry}
            >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Retry')}
            </Button>
            {isRead && (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={dump}
                >
                    <FileDown className="h-3.5 w-3.5" />
                    {t('Download raw storage')}
                </Button>
            )}
        </div>
    )
}

/** One non-destructive stop action covers generation, judging and queued work. */
function WorkStatusBanner() {
    const t = useI18n()
    const isJudging = useAppStore((s) => s.isJudging)
    const isProcessing = useAppStore((s) => s.isProcessing)
    const hasPendingWork = useAppStore(
        (s) =>
            s.messageQueue.length > 0 ||
            s.experimentRuns.some(
                (run) =>
                    run.status === 'queued' ||
                    run.status === 'running' ||
                    run.status === 'paused'
            )
    )
    const stopAll = useAppStore((s) => s.stopAll)
    if (!isJudging && !isProcessing && !hasPendingWork) return null
    return (
        <div
            role="status"
            className="flex flex-shrink-0 items-center gap-2 border-b bg-muted/40 px-4 py-1.5 text-sm"
        >
            {(isJudging || isProcessing) && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            <span className="flex-1">
                {isJudging
                    ? t('Judging Responses...')
                    : isProcessing
                      ? t('Running requests…')
                      : t('Pending work')}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={stopAll}
                className="gap-2"
            >
                <Square className="h-4 w-4" aria-hidden />
                {t('Stop All')}
            </Button>
        </div>
    )
}

const NAV_BAR_BOTTOM_PATHS = ['/', '/experiments', '/stats', '/models']
const NAV_BAR_BOTTOM = APP_ROUTES.filter((r) =>
    NAV_BAR_BOTTOM_PATHS.includes(r.path)
)
const NAV_MORE = APP_ROUTES.filter(
    (r) => !NAV_BAR_BOTTOM_PATHS.includes(r.path)
)
const NAV_GROUPS = ['workspace', 'assets', 'preferences'] as const

function isActivePath(pathname: string, path: string): boolean {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
}

export function Layout() {
    const t = useI18n()
    useAppPreferences()
    const location = useLocation()
    const [moreOpen, setMoreOpen] = useState(false)
    // Single scheduler mount: work continues on every route.
    useQueueProcessor()
    const commandDialog = useGlobalHotkeys()
    const visible = usePageVisibility()
    if (!visible) pauseStreamingUI()
    else resumeStreamingUI()

    const linkClass = (path: string, extra?: string) =>
        cn(
            'flex items-center rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            extra,
            isActivePath(location.pathname, path)
                ? 'bg-muted text-primary aria-current-page'
                : 'text-muted-foreground'
        )

    const renderSidebarLink = (item: (typeof APP_ROUTES)[number]) => {
        const active = isActivePath(location.pathname, item.path)
        return (
            <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={linkClass(
                    item.path,
                    'h-10 w-full gap-3 px-3 text-sm font-medium lg:justify-start'
                )}
                title={t(item.labelKey)}
            >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden />
                <span className="hidden text-left lg:inline">
                    {t(item.labelKey)}
                </span>
            </Link>
        )
    }

    const renderBottomLink = (item: (typeof APP_ROUTES)[number]) => {
        const active = isActivePath(location.pathname, item.path)
        return (
            <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                    'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1 transition-colors hover:bg-muted/50',
                    active ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-label={t(item.labelKey)}
            >
                <item.icon className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-medium leading-none">
                    {t(item.labelKey)}
                </span>
            </Link>
        )
    }

    const groupHeading = (group: (typeof NAV_GROUPS)[number]) => {
        const labelKey =
            group === 'workspace'
                ? 'Workspace'
                : group === 'assets'
                  ? 'Assets'
                  : 'Preferences'
        return (
            <div className="hidden px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1 lg:block">
                {t(labelKey)}
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background pt-[var(--safe-area-inset-top)] md:flex-row">
            <aside className="relative hidden h-full w-16 flex-shrink-0 flex-col border-r bg-background md:flex lg:w-52">
                <div className="flex h-14 items-center px-3 lg:px-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                        {'N'}
                    </div>
                    <span className="ml-2 hidden text-sm font-semibold lg:inline">
                        NiLLM
                    </span>
                </div>
                <nav
                    className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4"
                    aria-label={t('Main navigation')}
                >
                    {NAV_GROUPS.map((group) => (
                        <div key={group} className="flex flex-col">
                            {groupHeading(group)}
                            {APP_ROUTES.filter((r) => r.group === group).map(
                                renderSidebarLink
                            )}
                        </div>
                    ))}
                    <div className="mt-auto flex flex-col">
                        {renderSidebarLink(APP_ROUTES[APP_ROUTES.length - 1])}
                    </div>
                </nav>
            </aside>

            <nav
                className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t bg-background pb-[var(--safe-area-inset-bottom)] md:hidden"
                aria-label={t('Main navigation')}
            >
                {NAV_BAR_BOTTOM.map(renderBottomLink)}
                <button
                    type="button"
                    className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1 text-muted-foreground transition-colors hover:bg-muted/50"
                    aria-label={t('More')}
                    onClick={() => setMoreOpen(true)}
                >
                    <Menu className="h-5 w-5" aria-hidden />
                    <span className="text-[10px] font-medium leading-none">
                        {t('More')}
                    </span>
                </button>
            </nav>

            <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
                <DialogContent
                    className="sm:max-w-xs"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('More')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="flex flex-col gap-1">
                        {NAV_MORE.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMoreOpen(false)}
                                aria-current={
                                    isActivePath(location.pathname, item.path)
                                        ? 'page'
                                        : undefined
                                }
                                className={linkClass(
                                    item.path,
                                    'min-h-[44px] gap-3 px-3 text-sm font-medium'
                                )}
                            >
                                <item.icon
                                    className="h-5 w-5 flex-shrink-0"
                                    aria-hidden
                                />
                                {t(item.labelKey)}
                            </Link>
                        ))}
                    </DialogBody>
                </DialogContent>
            </Dialog>

            <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
                <StorageFailureBanner />
                <WorkStatusBanner />
                <Outlet />
            </main>
            {commandDialog}
        </div>
    )
}
