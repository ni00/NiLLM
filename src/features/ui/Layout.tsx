import { Outlet, Link, useLocation } from 'react-router'
import { Layers, BarChart3, Cpu, Box } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Layout() {
    const location = useLocation()

    const navItems = [
        { icon: Layers, label: 'Arena', path: '/' },
        { icon: BarChart3, label: 'Stats', path: '/stats' },
        { icon: Box, label: 'Tests', path: '/tests' },
        { icon: Cpu, label: 'Models', path: '/models' }
    ]

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar */}
            <aside className="w-16 border-r flex flex-col items-center py-4 gap-4 flex-shrink-0">
                <div className="mb-4">
                    {/* Logo or Brand */}
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                        N
                    </div>
                </div>

                <nav className="flex flex-col gap-2 w-full px-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    'flex flex-col items-center justify-center p-2 rounded-md transition-all gap-1 hover:bg-muted/50',
                                    isActive
                                        ? 'bg-muted text-primary'
                                        : 'text-muted-foreground'
                                )}
                                title={item.label}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium text-center leading-tight">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    )
}
