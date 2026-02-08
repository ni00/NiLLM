import { createBrowserRouter, RouterProvider } from 'react-router'

import { Layout } from '@/features/ui/Layout'

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
                    lazy: () => import('@/app/routes/home')
                },
                {
                    path: '/stats',
                    lazy: () => import('@/app/routes/stats')
                },
                {
                    path: '/tests',
                    lazy: () => import('@/app/routes/tests')
                },
                {
                    path: '/models',
                    lazy: () => import('@/app/routes/models')
                },
                {
                    path: '/prompts',
                    lazy: () => import('@/app/routes/prompts')
                },
                {
                    path: '*',
                    lazy: () => import('@/app/routes/not-found')
                }
            ]
        }
    ])

export default function AppRouter() {
    return <RouterProvider router={createAppRouter()} />
}
