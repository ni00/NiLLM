import { useLayoutEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function useAppPreferences() {
    const language = useAppStore((state) => state.language)
    const theme = useAppStore((state) => state.theme)
    const density = useAppStore((state) => state.density)

    useLayoutEffect(() => {
        // Density only tightens list/table/card spacing; body text size and
        // touch targets stay untouched either way.
        document.documentElement.classList.toggle(
            'density-compact',
            density === 'compact'
        )
    }, [density])

    useLayoutEffect(() => {
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : language
    }, [language])

    useLayoutEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const applyTheme = () => {
            const dark =
                theme === 'dark' || (theme === 'system' && media.matches)
            document.documentElement.classList.toggle('dark', dark)
            document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
        }
        applyTheme()
        if (theme !== 'system') return
        media.addEventListener('change', applyTheme)
        return () => media.removeEventListener('change', applyTheme)
    }, [theme])
}
