import { useState, useEffect } from 'react'

export function usePageVisibility(): boolean {
    const [isVisible, setIsVisible] = useState(!document.hidden)

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () =>
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            )
    }, [])

    return isVisible
}

export function useRouteActive(targetPath: string): boolean {
    const [isActive, setIsActive] = useState(
        window.location.pathname === targetPath
    )

    useEffect(() => {
        const checkActive = () => {
            setIsActive(window.location.pathname === targetPath)
        }

        window.addEventListener('popstate', checkActive)

        const originalPushState = history.pushState
        const originalReplaceState = history.replaceState

        history.pushState = function (...args) {
            originalPushState.apply(this, args)
            checkActive()
        }

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args)
            checkActive()
        }

        return () => {
            window.removeEventListener('popstate', checkActive)
            history.pushState = originalPushState
            history.replaceState = originalReplaceState
        }
    }, [targetPath])

    return isActive
}

export function useStreamingActive(arenaPath: string = '/'): {
    isStreamingActive: boolean
    isPageVisible: boolean
    isRouteActive: boolean
} {
    const isPageVisible = usePageVisibility()
    const isRouteActive = useRouteActive(arenaPath)
    const isStreamingActive = isPageVisible && isRouteActive

    return {
        isStreamingActive,
        isPageVisible,
        isRouteActive
    }
}
