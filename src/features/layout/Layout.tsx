import { useI18n } from '@/lib/i18n'
import { Outlet, Link, useLocation } from 'react-router'
import {
    Layers,
    BarChart3,
    Cpu,
    Box,
    BookTemplate,
    Settings,
    DatabaseZap,
    RotateCcw,
    FileDown
} from 'lucide-react'
import { useAppPreferences } from '@/features/settings/useAppPreferences'
import { useQueueProcessor } from '@/features/chat-arena/hooks/useQueueProcessor'
import { usePageVisibility } from '@/lib/hooks/usePageVisibility'
import {
    pauseStreamingUI,
    resumeStreamingUI
} from '@/features/benchmark/streaming-ui'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
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
            className="flex flex-wrap items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-foreground"
        >
            <DatabaseZap className="h-4 w-4 text-destructive shrink-0" />
            <span className="font-medium">
                {isRead
                    ? t('Local data could not be read.')
                    : t('Changes are not being saved.')}
            </span>
            <span className="text-muted-foreground truncate flex-1 min-w-40">
                {persistenceError.message}
            </span>
            {!isRead && (
                <span className="text-muted-foreground">
                    {t(
                        'Latest changes stay in memory and retry automatically.'
                    )}
                </span>
            )}
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

export function Layout() {
    const t = useI18n()
    useAppPreferences()
    const location = useLocation()
    // Single scheduler mount: work continues on every route.
    useQueueProcessor()
    const visible = usePageVisibility()
    if (!visible) pauseStreamingUI()
    else resumeStreamingUI()

    const navItems = [
        { icon: Layers, label: t('Arena'), path: '/' },
        { icon: BookTemplate, label: t('Prompts'), path: '/prompts' },
        { icon: Box, label: t('Tests'), path: '/tests' },
        { icon: Cpu, label: t('Models'), path: '/models' },
        { icon: BarChart3, label: t('Stats'), path: '/stats' },
        { icon: Settings, label: t('Settings'), path: '/settings' }
    ]

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden pt-[var(--safe-area-inset-top)]">
            {/* Sidebar / Bottom Nav */}
            <aside className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background md:border-t-0 md:relative md:h-full md:w-20 md:border-r flex md:flex-col items-center justify-around md:justify-start md:py-4 md:gap-4 flex-shrink-0 pb-[var(--safe-area-inset-bottom)]">
                <div className="hidden md:block mb-4">
                    {/* Logo or Brand */}
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {'N'}
                    </div>
                </div>

                <nav className="flex flex-row md:flex-col gap-1 md:gap-2 w-full h-full md:h-auto md:flex-1 px-1 justify-around md:justify-start items-center">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'flex flex-col items-center justify-center p-2 md:px-1 md:w-full rounded-md transition-all gap-1 hover:bg-muted/50 flex-1 md:flex-none',
                                    item.path === '/settings' && 'md:mt-auto',
                                    isActive
                                        ? 'bg-muted text-primary'
                                        : 'text-muted-foreground'
                                )}
                                title={item.label}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] md:text-xs font-medium text-center leading-tight whitespace-nowrap">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden pb-16 md:pb-0">
                <StorageFailureBanner />
                <Outlet />
            </main>
        </div>
    )
}
