import { Outlet, Link, useLocation } from 'react-router'
import { Layers, BarChart3, Cpu, Box, BookTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Layout() {
    const location = useLocation()

    const navItems = [
        { icon: Layers, label: 'Arena', path: '/' },
        { icon: BookTemplate, label: 'Prompts', path: '/prompts' },
        { icon: Box, label: 'Tests', path: '/tests' },
        { icon: Cpu, label: 'Models', path: '/models' },
        { icon: BarChart3, label: 'Stats', path: '/stats' }
    ]

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
            {/* Sidebar / Bottom Nav */}
            <aside className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background md:border-t-0 md:relative md:h-full md:w-16 md:border-r flex md:flex-col items-center justify-around md:justify-start md:py-4 md:gap-4 flex-shrink-0">
                <div className="hidden md:block mb-4">
                    {/* Logo or Brand */}
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                        N
                    </div>
                </div>

                <nav className="flex flex-row md:flex-col gap-1 md:gap-2 w-full h-full md:h-auto px-2 justify-around md:justify-start items-center">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    'flex flex-col items-center justify-center p-2 rounded-md transition-all gap-1 hover:bg-muted/50 flex-1 md:flex-none',
                                    isActive
                                        ? 'bg-muted text-primary'
                                        : 'text-muted-foreground'
                                )}
                                title={item.label}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] md:text-xs font-medium text-center leading-tight">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden pb-16 md:pb-0">
                <Outlet />
            </main>
        </div>
    )
}
