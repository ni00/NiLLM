import { useI18n } from '@/lib/i18n'
import {
    createBrowserRouter,
    RouterProvider,
    type DataRouter
} from 'react-router'
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
    const [router, setRouter] = useState<DataRouter | null>(null)
    useEffect(() => {
        let active = true
        void storeHydration.then(() => {
            if (active) setRouter(createAppRouter())
        })
        return () => {
            active = false
        }
    }, [])
    if (!router) return <LoadingView />
    return <RouterProvider router={router} />
}
