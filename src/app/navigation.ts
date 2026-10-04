import {
    Layers,
    FlaskConical,
    BarChart3,
    Box,
    BookTemplate,
    Cpu,
    Settings
} from 'lucide-react'
import type { RouteObject } from 'react-router'

export type NavGroup = 'workspace' | 'assets' | 'preferences'

export interface AppRoute {
    path: string
    labelKey: string
    icon: typeof Layers
    group: NavGroup
    lazy: () => Promise<RouteObject>
}

export const APP_ROUTES: AppRoute[] = [
    {
        path: '/',
        labelKey: 'Arena',
        icon: Layers,
        group: 'workspace',
        lazy: () => import('@/pages/home')
    },
    {
        path: '/experiments',
        labelKey: 'Experiments',
        icon: FlaskConical,
        group: 'workspace',
        lazy: () => import('@/pages/experiments')
    },
    {
        path: '/stats',
        labelKey: 'Stats',
        icon: BarChart3,
        group: 'workspace',
        lazy: () => import('@/pages/stats')
    },
    {
        path: '/tests',
        labelKey: 'Tests',
        icon: Box,
        group: 'assets',
        lazy: () => import('@/pages/tests')
    },
    {
        path: '/prompts',
        labelKey: 'Prompts',
        icon: BookTemplate,
        group: 'assets',
        lazy: () => import('@/pages/prompts')
    },
    {
        path: '/models',
        labelKey: 'Models',
        icon: Cpu,
        group: 'assets',
        lazy: () => import('@/pages/models')
    },
    {
        path: '/settings',
        labelKey: 'Settings',
        icon: Settings,
        group: 'preferences',
        lazy: () => import('@/pages/settings')
    }
]

export function mainRoutes(): RouteObject[] {
    return APP_ROUTES.map(({ path, lazy }) => ({ path, lazy }) as RouteObject)
}
