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
        reportCompressedSize: false,
        // The module-preload helper injects <link> tags through `document`,
        // which does not exist in the generation worker that shares this
        // build's chunks. Dynamic imports still resolve without the hint.
        modulePreload: false,
        rollupOptions: {
            // The streaming worker is an entry of the main build, not a Vite
            // worker build, so it can share the provider SDK chunks with the
            // window instead of carrying a second copy of them.
            input: {
                index: fileURLToPath(new URL('./index.html', import.meta.url)),
                'stream-worker': fileURLToPath(
                    new URL(
                        './src/lib/workers/stream.worker.ts',
                        import.meta.url
                    )
                )
            },
            output: {
                entryFileNames: (chunk) =>
                    chunk.name === 'stream-worker'
                        ? 'assets/stream-worker.js'
                        : 'assets/[name]-[hash].js'
            }
        }
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
