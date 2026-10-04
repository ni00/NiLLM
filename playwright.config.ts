import { defineConfig } from '@playwright/test'
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    use: {
        baseURL: 'http://127.0.0.1:1420',
        viewport: { width: 1440, height: 1000 },
        trace: 'retain-on-failure'
    },
    webServer: {
        command: process.env.PLAYWRIGHT_PREVIEW
            ? 'pnpm preview --host 127.0.0.1 --port 1420'
            : 'pnpm dev --host 127.0.0.1',
        url: 'http://127.0.0.1:1420',
        reuseExistingServer: !process.env.CI
    }
})
