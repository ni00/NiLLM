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
