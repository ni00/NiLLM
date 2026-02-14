import React from 'react'
import ReactDOM from 'react-dom/client'
import '@saurl/tauri-plugin-safe-area-insets-css-api'
import App from '@/app'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
