import { useEffect } from 'react'
import { emit } from '@tauri-apps/api/event'

import './global.css'

import AppRouter from '@/app/router'
import AppProvider from '@/app/provider'

const isTauri =
    typeof window !== 'undefined' &&
    !!((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)

export default function App() {
    useEffect(() => {
        if (isTauri) {
            emit('frontend-ready')
        }
    }, [])

    return (
        <AppProvider>
            <AppRouter />
        </AppProvider>
    )
}
