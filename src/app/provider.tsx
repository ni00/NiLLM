import { useI18n } from '@/lib/i18n'
import { ReactNode, Suspense } from 'react'
import AppErrorPage from '@/features/errors/app-error'
import { ErrorBoundary } from 'react-error-boundary'
import { TooltipProvider } from '@/components/ui/tooltip'

function LoadingFallback() {
    const t = useI18n()
    return <div role="status">{t('Loading...')}</div>
}

export default function AppProvider({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary FallbackComponent={AppErrorPage}>
                <TooltipProvider>{children}</TooltipProvider>
            </ErrorBoundary>
        </Suspense>
    )
}
