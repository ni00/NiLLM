import { useI18n } from '@/lib/i18n'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { useState, useEffect } from 'react'
import { storeHydration } from '@/lib/store'

import { Layout } from '@/features/layout/Layout'
import { mainRoutes } from '@/app/navigation'

const createAppRouter = () =>
    createBrowserRouter([
        {
            element: <Layout />,
            HydrateFallback: LoadingView,
            children: [
                ...mainRoutes(),
                {
                    path: '/experiments/:runId',
                    lazy: () => import('@/pages/experiment-detail')
                },
                {
                    path: '*',
                    lazy: () => import('@/pages/not-found')
                }
            ]
        }
    ])

// Resolve the initial route chunk while IndexedDB hydration is in flight.
// Mounting still waits below, so defaults cannot overwrite saved sessions.
const router = createAppRouter()
if (import.meta.hot) import.meta.hot.dispose(() => router.dispose())

function LoadingView() {
    const t = useI18n()
    return (
        <div
            role="status"
            className="flex h-screen items-center justify-center"
        >
            {t('Loading your arena…')}
        </div>
    )
}

export default function AppRouter() {
    const [hydrated, setHydrated] = useState(false)
    useEffect(() => {
        let active = true
        void storeHydration.then(() => {
            if (active) setHydrated(true)
        })
        return () => {
            active = false
        }
    }, [])
    if (!hydrated) return <LoadingView />
    return <RouterProvider router={router} />
}
