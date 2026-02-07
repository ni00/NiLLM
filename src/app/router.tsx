import { createBrowserRouter, RouterProvider } from 'react-router'

import { Layout } from '@/features/ui/Layout'

const createAppRouter = () =>
    createBrowserRouter([
        {
            element: <Layout />,
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
                    path: '/settings',
                    lazy: () => import('@/app/routes/settings')
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
