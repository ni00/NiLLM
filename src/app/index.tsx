import { useEffect } from 'react'
import { emit } from '@tauri-apps/api/event'

import './global.css'

import AppRouter from '@/app/router'
import AppProvider from '@/app/provider'

export default function App() {
    useEffect(() => {
        emit('frontend-ready')
    }, [])

    return (
        <AppProvider>
            <AppRouter />
        </AppProvider>
    )
}
