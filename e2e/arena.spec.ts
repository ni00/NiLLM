import { expect, test } from '@playwright/test'

test('bulk provider import, deduplication and selection survive a reload', async ({
    page
}) => {
    await page.route('https://api.deepseek.com/v1/models', (route) =>
        route.fulfill({
            json: {
                data: [{ id: 'deepseek-test-one' }, { id: 'deepseek-test-two' }]
            }
        })
    )
    await page.goto('/models')
    await page
        .getByRole('button', { name: 'Add provider', exact: true })
        .click()
    const dialog = page.getByRole('dialog')
    await dialog
        .getByRole('combobox', { name: 'Provider', exact: true })
        .click()
    await page.getByText('DeepSeek', { exact: true }).click()
    await dialog
        .getByRole('button', { name: 'Fetch models', exact: true })
        .click()
    await expect(dialog.getByText('2 / 2 selected')).toBeVisible()
    await dialog.getByRole('button', { name: 'Add 2 models' }).click()
    await expect(
        page.getByRole('status').filter({ hasText: 'Added 2 models.' })
    ).toHaveText('Added 2 models.')
    const provider = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'DeepSeek' }) })
    await expect(
        provider.getByText('deepseek-test-one', { exact: true }).first()
    ).toBeVisible()
    await provider.getByRole('button', { name: 'Select provider' }).click()
    await expect(provider.getByText('2 models · 2 active')).toBeVisible()
    await provider.getByRole('button', { name: 'Fetch all models' }).click()
    await dialog
        .getByRole('button', { name: 'Fetch models', exact: true })
        .click()
    await dialog.getByRole('button', { name: 'Add 2 models' }).click()
    await expect(
        page.getByRole('status').filter({ hasText: 'All selected models' })
    ).toHaveText('All selected models are already configured.')
    await page.waitForTimeout(350)
    await page.reload()
    await expect(provider.getByText('2 models · 2 active')).toBeVisible()
    await page.screenshot({
        path: 'test-results/models-desktop.png',
        fullPage: true
    })
})

test('reports show successful and failed requests with expanded metrics', async ({
    page
}) => {
    await page.goto('/models')
    await page.evaluate(async () => {
        const { useAppStore, storeHydration } =
            await import('/src/lib/store.ts')
        await storeHydration
        const store = useAppStore.getState()
        const model = store.models[0]
        store.setSessions([
            {
                id: 'report-session',
                title: 'Metrics',
                models: [model.id],
                messages: [],
                createdAt: Date.now(),
                results: {
                    [model.id]: [
                        {
                            id: 'ok',
                            modelId: model.id,
                            prompt: 'Hi',
                            response: 'Hello',
                            status: 'completed',
                            timestamp: Date.now(),
                            metrics: {
                                ttft: 100,
                                tps: 20,
                                totalDuration: 1000,
                                tokenCount: 18,
                                inputTokens: 3,
                                outputTokens: 18,
                                tokenSource: 'api',
                                cost: 0.0001
                            }
                        },
                        {
                            id: 'error',
                            modelId: model.id,
                            prompt: 'Hi',
                            response: '',
                            status: 'error',
                            error: 'Failed',
                            timestamp: Date.now(),
                            metrics: {
                                ttft: 0,
                                tps: 0,
                                totalDuration: 0,
                                tokenCount: 0
                            }
                        }
                    ]
                }
            }
        ])
    })
    await page.getByRole('link', { name: 'Stats' }).click()
    await expect(page.getByText('50.0%', { exact: true }).first()).toBeVisible()
    await expect(
        page.getByRole('button', { name: 'Sort by p95TTFT' })
    ).toBeVisible()
    await expect(
        page.getByText('100 ms', { exact: true }).first()
    ).toBeVisible()
    await expect(page.getByText('In 3 / Out 18')).toBeVisible()
    await page.screenshot({
        path: 'test-results/stats-desktop.png',
        fullPage: true
    })
})

test('mobile navigation and provider dialog fit the viewport', async ({
    page
}) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/models')
    await page
        .getByRole('button', { name: 'Add provider', exact: true })
        .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(390)
    await page.screenshot({
        path: 'test-results/provider-mobile.png',
        fullPage: true
    })
})

test('arena worker streams text and reasoning with exact usage', async ({
    page
}) => {
    await page.route(
        'https://mock-provider.test/v1/chat/completions',
        (route) => {
            const chunks = [
                {
                    choices: [
                        {
                            index: 0,
                            delta: {
                                role: 'assistant',
                                reasoning_content: 'Checking the request.'
                            },
                            finish_reason: null
                        }
                    ]
                },
                {
                    choices: [
                        {
                            index: 0,
                            delta: { content: 'Worker streaming works.' },
                            finish_reason: null
                        }
                    ]
                },
                {
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                    usage: {
                        prompt_tokens: 5,
                        completion_tokens: 8,
                        total_tokens: 13
                    }
                }
            ]
            return route.fulfill({
                contentType: 'text/event-stream',
                body:
                    chunks
                        .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
                        .join('') + 'data: [DONE]\n\n'
            })
        }
    )
    await page.goto('/models')
    await page.evaluate(async () => {
        const { useAppStore, storeHydration } =
            await import('/src/lib/store.ts')
        await storeHydration
        const store = useAppStore.getState()
        store.setModels([
            {
                id: 'worker-model',
                name: 'Worker Model',
                provider: 'custom',
                providerId: 'mock',
                baseURL: 'https://mock-provider.test/v1',
                enabled: true
            }
        ])
        store.setModelGroupActive(['worker-model'], true)
        store.clearSessions()
    })
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    await expect(
        page.getByText('Worker Model', { exact: true }).first()
    ).toBeVisible()
    await page
        .getByPlaceholder(
            'Send a message to all models... (Use @ to mention models)'
        )
        .fill('Test streaming')
    await page
        .getByPlaceholder(
            'Send a message to all models... (Use @ to mention models)'
        )
        .press('Shift+Enter')
    await expect
        .poll(
            async () =>
                page.evaluate(async () => {
                    const { useAppStore, storeHydration } =
                        await import('/src/lib/store.ts')
                    await storeHydration
                    const s = useAppStore.getState()
                    return {
                        queue: s.messageQueue.length,
                        processing: s.isProcessing,
                        activeSessionId: s.activeSessionId,
                        result: s.sessions[0]?.results['worker-model']?.[0]
                            ?.status,
                        error: s.sessions[0]?.results['worker-model']?.[0]
                            ?.error
                    }
                }),
            { timeout: 20000 }
        )
        .toMatchObject({ result: 'completed' })
    await expect(
        page.getByText('Worker streaming works.', { exact: true })
    ).toBeVisible()
    const stored = await page.evaluate(async () => {
        const { useAppStore, storeHydration } =
            await import('/src/lib/store.ts')
        await storeHydration
        return useAppStore.getState().sessions[0].results['worker-model'][0]
    })
    expect(stored.status).toBe('completed')
    expect(stored.reasoning).toBe('Checking the request.')
    expect(stored.metrics.outputTokens).toBe(8)
    expect(stored.metrics.tokenCount).toBe(8)
})
