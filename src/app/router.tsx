import { useI18n } from '@/lib/i18n'
import {
    createBrowserRouter,
    RouterProvider,
    type DataRouter
} from 'react-router'
import { useState, useEffect } from 'react'
import { storeHydration } from '@/lib/store'

import { Layout } from '@/features/layout/Layout'

const createAppRouter = () =>
    createBrowserRouter([
        {
            element: <Layout />,
            HydrateFallback: LoadingView,
            children: [
                {
                    path: '/',
                    lazy: () => import('@/pages/home')
                },
                {
                    path: '/stats',
                    lazy: () => import('@/pages/stats')
                },
                {
                    path: '/experiments',
                    lazy: () => import('@/pages/experiments')
                },
                {
                    path: '/experiments/:runId',
                    lazy: () => import('@/pages/experiment-detail')
                },
                {
                    path: '/tests',
                    lazy: () => import('@/pages/tests')
                },
                {
                    path: '/models',
                    lazy: () => import('@/pages/models')
                },
                {
                    path: '/prompts',
                    lazy: () => import('@/pages/prompts')
                },
                {
                    path: '/settings',
                    lazy: () => import('@/pages/settings')
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
