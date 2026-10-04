import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**']
        }
    },

    // Match the previously supported Tauri WebViews explicitly across Vite upgrades.
    build: {
        target: ['es2022', 'chrome107', 'safari16'],
        reportCompressedSize: false
    },
    // Imports in model workers must remain separate from the application entry.
    worker: { format: 'es' },

    // Shadcn UI
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            react: fileURLToPath(
                new URL('./node_modules/react', import.meta.url)
            ),
            'react-dom': fileURLToPath(
                new URL('./node_modules/react-dom', import.meta.url)
            )
        }
    }
})
