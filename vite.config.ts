import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],

    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        watch: {
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

    // Discover worker dependencies before the first request, so lazy parser
    // imports cannot trigger a development reload in the middle of a stream.
    optimizeDeps: {
        entries: [
            'index.html',
            'src/lib/workers/stream.worker.ts',
            'src/features/chat-arena/markdown/markdown.worker.ts'
        ]
    },

    resolve: {
        alias: {
            // The browser export uses document; Markdown workers need the
            // package's DOM-free entity decoder in development and builds.
            'decode-named-character-reference': fileURLToPath(
                new URL(
                    './node_modules/decode-named-character-reference/index.js',
                    import.meta.url
                )
            ),
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
