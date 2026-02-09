import { createBrowserRouter, RouterProvider } from 'react-router'

import { Layout } from '@/features/layout/Layout'

const createAppRouter = () =>
    createBrowserRouter([
        {
            element: <Layout />,
            HydrateFallback: () => (
                <div className="flex h-screen w-screen items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground animate-pulse">
                            Initializing app...
                        </p>
                    </div>
                </div>
            ),
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
                    path: '*',
                    lazy: () => import('@/pages/not-found')
                }
            ]
        }
    ])

export default function AppRouter() {
    return <RouterProvider router={createAppRouter()} />
}
