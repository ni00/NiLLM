import { expect, test } from '@playwright/test'
import { createServer, type ServerResponse } from 'node:http'

test('concurrent Markdown streams stay bounded and preserve complete answers and scrolling', async ({
    page
}) => {
    const content =
        '# First Markdown section\n\n' +
        Array.from(
            { length: 180 },
            (_, index) =>
                `## Block ${index}\n\nParagraph **${index}** with [reference](https://example.com). 中文内容。\n\n` +
                (index % 10 === 0
                    ? '| Name | Value |\n| --- | --- |\n| item | 1 |\n\n\x60\x60\x60ts\nconst value = 1;\n\x60\x60\x60\n\n'
                    : '')
        ).join('') +
        '\n\nFinal Markdown answer.'
    const timers = new Set<ReturnType<typeof setInterval>>()
    let requests = 0
    let finishStreams = false
    const server = createServer((request, reply) => {
        reply.setHeader('Access-Control-Allow-Origin', '*')
        reply.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
        reply.setHeader(
            'Access-Control-Allow-Headers',
            'content-type,authorization'
        )
        if (request.method === 'OPTIONS') {
            reply.writeHead(204).end()
            return
        }
        request.resume()
        requests++
        reply.setHeader('Content-Type', 'text/event-stream')
        const send = (delta: Record<string, string>) =>
            reply.write(
                `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`
            )
        send({
            reasoning_content: 'Preserved **hidden** reasoning.',
            content: content.slice(0, 1000)
        })
        let offset = 1000
        const timer = setInterval(() => {
            if (offset >= content.length / 2 && !finishStreams) return
            send({ content: content.slice(offset, offset + 1000) })
            offset += 1000
            if (offset >= content.length) {
                clearInterval(timer)
                timers.delete(timer)
                reply.end(
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 4000, total_tokens: 4003 } })}\n\ndata: [DONE]\n\n`
                )
            }
        }, 80)
        timers.add(timer)
        reply.on('close', () => {
            clearInterval(timer)
            timers.delete(timer)
        })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
        throw new Error('Missing Markdown fixture port')
    let parserWorkers = 0
    page.on('worker', (worker) => {
        if (worker.url().includes('markdown.worker')) parserWorkers++
    })
    try {
        await page.goto('/models')
        await page
            .getByRole('button', { name: 'Add provider', exact: true })
            .waitFor()
        await page.evaluate(async (baseURL) => {
            const { useAppStore, storeHydration } =
                await import('/src/lib/store.ts')
            await storeHydration
            const store = useAppStore.getState()
            const models = Array.from({ length: 4 }, (_, index) => ({
                id: `markdown-${index}`,
                name: `Markdown ${index}`,
                provider: 'custom' as const,
                baseURL,
                enabled: true
            }))
            store.setModels(models)
            store.setModelGroupActive(
                models.map((model) => model.id),
                true
            )
            store.clearSessions()
        }, `http://127.0.0.1:${address.port}/v1`)
        await page.getByRole('link', { name: 'Arena', exact: true }).click()
        const input = page.getByPlaceholder(
            'Send a message to all models... (Use @ to mention models)'
        )
        await input.fill('Concurrent Markdown')
        await input.press('Shift+Enter')
        await expect.poll(() => requests).toBe(4)
        const column = page.locator('[data-model-id="markdown-0"]')
        const markdown = column.locator('[data-markdown-windowed]')
        await expect(markdown).toHaveCount(1)
        const viewport = column.locator('[data-slot="scroll-area-viewport"]')
        const box = await viewport.boundingBox()
        if (!box) throw new Error('Missing Markdown viewport')
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, -500)
        const follow = column.locator('.scroll-nav-buttons button').nth(1)
        await expect(follow).toHaveAttribute('aria-pressed', 'false')
        finishStreams = true
        for (let index = 1; index < 4; index++) {
            await expect(
                page
                    .locator(`[data-model-id="markdown-${index}"]`)
                    .getByText('Final Markdown answer.', { exact: true })
            ).toBeInViewport()
        }
        await expect
            .poll(() =>
                page.evaluate(async () => {
                    const { useAppStore } = await import('/src/lib/store.ts')
                    return Object.values(
                        useAppStore.getState().sessions[0].results
                    )
                        .flat()
                        .map((result) => ({
                            status: result.status,
                            response: result.response,
                            reasoning: result.reasoning,
                            tokens: result.metrics.outputTokens
                        }))
                })
            )
            .toEqual(
                Array.from({ length: 4 }, () => ({
                    status: 'completed',
                    response: content,
                    reasoning: 'Preserved **hidden** reasoning.',
                    tokens: 4000
                }))
            )
        expect(parserWorkers).toBe(1)
        await expect(page.locator('.thinking-block-content')).toHaveCount(0)
        await expect(follow).toHaveAttribute('aria-pressed', 'false')
        expect(
            await viewport.evaluate(
                (element) =>
                    element.scrollHeight -
                    element.clientHeight -
                    element.scrollTop
            )
        ).toBeGreaterThan(300)
        await expect(markdown).toHaveCount(1)
        expect(await markdown.locator('[data-index]').count()).toBeLessThan(50)
        await column.getByTitle('Scroll to Top', { exact: true }).click()
        await expect(
            column.getByRole('heading', {
                name: 'First Markdown section',
                exact: true
            })
        ).toBeInViewport()
        await expect(column.getByRole('table').first()).toBeVisible()
        await expect(column.locator('code').first()).toContainText(
            'const value = 1;'
        )
        await column.getByTitle('Scroll to Bottom', { exact: true }).click()
        await expect(
            column.getByText('Final Markdown answer.', { exact: true })
        ).toBeInViewport()
    } finally {
        timers.forEach(clearInterval)
        server.closeAllConnections()
        await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve()))
        )
    }
})

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
    await expect(page.getByText('50%', { exact: true }).first()).toBeVisible()
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

test('manual scroll stays in control while a windowed response grows', async ({
    page
}) => {
    let response: ServerResponse | undefined
    let interval: ReturnType<typeof setInterval> | undefined
    let streamedText = 'x'.repeat(10000)
    let requests = 0
    const chunk = 'x'.repeat(1000)
    const delta = (text: string) =>
        `data: ${JSON.stringify({
            choices: [
                { index: 0, delta: { content: text }, finish_reason: null }
            ]
        })}\n\n`
    const server = createServer((request, reply) => {
        reply.setHeader('Access-Control-Allow-Origin', '*')
        reply.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
        reply.setHeader(
            'Access-Control-Allow-Headers',
            request.headers['access-control-request-headers'] ??
                'content-type,authorization'
        )
        if (request.method === 'OPTIONS') {
            reply.writeHead(204).end()
            return
        }
        request.resume()
        requests += 1
        if (requests !== 1) {
            reply.writeHead(409).end('Duplicate stream request')
            return
        }
        response = reply
        reply.setHeader('Content-Type', 'text/event-stream')
        reply.write(delta(streamedText))
        interval = setInterval(() => {
            streamedText += chunk
            reply.write(delta(chunk))
        }, 80)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
        throw new Error('Missing streaming fixture port')
    }
    try {
        await page.setViewportSize({ width: 1440, height: 1000 })
        await page.goto('/')
        await page.evaluate(async (baseURL) => {
            const { useAppStore, storeHydration } =
                await import('/src/lib/store.ts')
            await storeHydration
            const store = useAppStore.getState()
            const model = store.models[0]
            store.updateModel(model.id, { baseURL, apiKey: 'fixture-key' })
            store.setModelGroupActive(store.activeModelIds, false)
            store.setModelGroupActive([model.id], true)
            const sessionId = store.createSession('Windowed stream', [model.id])
            store.setSessions([
                {
                    id: sessionId,
                    title: 'Windowed stream',
                    models: [model.id],
                    messages: [],
                    createdAt: Date.now(),
                    results: {
                        [model.id]: Array.from({ length: 180 }, (_, index) => ({
                            id: `history-${index}`,
                            modelId: model.id,
                            prompt: `History ${index}`,
                            response:
                                index === 179
                                    ? 'p'.repeat(5000)
                                    : 'Earlier response.',
                            status: index === 179 ? 'error' : 'completed',
                            error: index === 179 ? 'Retry fixture' : undefined,
                            timestamp: Date.now(),
                            metrics: {
                                ttft: 100,
                                tps: 20,
                                totalDuration: 1000,
                                tokenCount: 10
                            }
                        }))
                    }
                }
            ])
        }, `http://127.0.0.1:${address.port}/v1`)
        const latest = page.locator('[data-result-id="history-179"]')
        await latest.getByRole('button', { name: 'Retry', exact: true }).click()
        await expect(latest.locator('p').first()).toContainText(
            'x'.repeat(10000)
        )
        const viewport = page.locator('main [data-slot="scroll-area-viewport"]')
        const box = await viewport.boundingBox()
        if (!box) throw new Error('Missing history viewport')
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, -500)
        const follow = page.locator('.scroll-nav-buttons button').nth(1)
        await expect(follow).toHaveAttribute('aria-pressed', 'false')
        const gap = () =>
            viewport.evaluate(
                (element) =>
                    element.scrollHeight -
                    element.clientHeight -
                    element.scrollTop
            )
        await expect.poll(gap).toBeGreaterThan(300)
        clearInterval(interval)
        interval = undefined
        if (!response) throw new Error('Missing active stream')
        const ending = '\n\nFinal streamed answer.'
        response.write(delta(ending))
        response.end(
            `data: ${JSON.stringify({
                choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                usage: {
                    prompt_tokens: 3,
                    completion_tokens: 6,
                    total_tokens: 9
                }
            })}\n\ndata: [DONE]\n\n`
        )
        const finalText = streamedText + ending
        await expect
            .poll(() =>
                page.evaluate(async () => {
                    const { useAppStore } = await import('/src/lib/store.ts')
                    const store = useAppStore.getState()
                    const rows = store.sessions[0].results[store.models[0].id]
                    return rows[179]
                })
            )
            .toMatchObject({ status: 'completed', response: finalText })
        await expect(follow).toHaveAttribute('aria-pressed', 'false')
        await expect.poll(gap).toBeGreaterThan(300)
        await page.getByTitle('Scroll to Top', { exact: true }).click()
        const first = page.locator('[data-result-id="history-0"]')
        await first.getByText('History 0').click()
        await expect(
            first.getByText('Earlier response.', { exact: true })
        ).toBeVisible()
        await first
            .getByRole('button', { name: 'Rate 5 out of 5', exact: true })
            .click()
        await page.getByTitle('Scroll to Bottom', { exact: true }).click()
        await expect(
            latest.getByText('Final streamed answer.', { exact: true })
        ).toBeVisible()
        await page.getByTitle('Scroll to Top', { exact: true }).click()
        await expect(
            first.getByText('Earlier response.', { exact: true })
        ).toBeVisible()
        const retained = await page.evaluate(async () => {
            const { useAppStore } = await import('/src/lib/store.ts')
            const store = useAppStore.getState()
            const rows = store.sessions[0].results[store.models[0].id]
            return {
                count: rows.length,
                firstRating: rows[0].rating,
                firstSource: rows[0].ratingSource,
                lastResponse: rows[179].response
            }
        })
        expect(retained).toEqual({
            count: 180,
            firstRating: 5,
            firstSource: 'human',
            lastResponse: finalText
        })
        expect(requests).toBe(1)
    } finally {
        clearInterval(interval)
        response?.destroy()
        server.closeAllConnections()
        await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve()))
        )
    }
})

test('IME composition and open dialogs retain the arena draft without sending', async ({
    page
}) => {
    let requests = 0
    const server = createServer((request, reply) => {
        reply.setHeader('Access-Control-Allow-Origin', '*')
        reply.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
        reply.setHeader(
            'Access-Control-Allow-Headers',
            'content-type,authorization'
        )
        if (request.method === 'OPTIONS') {
            reply.writeHead(204).end()
            return
        }
        request.resume()
        requests += 1
        reply.writeHead(500).end('Unexpected send during keyboard guard')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
        throw new Error('Missing keyboard fixture port')
    }
    try {
        await page.goto('/')
        await page.evaluate(async (baseURL) => {
            const { useAppStore, storeHydration } =
                await import('/src/lib/store.ts')
            await storeHydration
            const store = useAppStore.getState()
            const model = store.models[0]
            store.updateModel(model.id, { baseURL, apiKey: 'fixture-key' })
            store.setModelGroupActive(store.activeModelIds, false)
            store.setModelGroupActive([model.id], true)
            store.createSession('Keyboard guard', [model.id])
        }, `http://127.0.0.1:${address.port}/v1`)
        const draft = page.locator('main textarea')
        await draft.fill('UNSENT DRAFT ')
        const cdp = await page.context().newCDPSession(page)
        try {
            await cdp.send('Input.imeSetComposition', {
                text: '日本語',
                selectionStart: 3,
                selectionEnd: 3
            })
            await page.keyboard.press('Control+Enter')
            await page.keyboard.press('Shift+Enter')
            await expect(draft).toHaveValue(/^UNSENT DRAFT /)
        } finally {
            await cdp.send('Input.imeSetComposition', {
                text: '',
                selectionStart: 0,
                selectionEnd: 0
            })
            await cdp.detach()
        }
        await page
            .getByRole('button', { name: 'Configure', exact: true })
            .click()
        await expect(page.getByRole('dialog')).toBeVisible()
        const configuration = page.getByRole('dialog')
        await configuration
            .getByRole('button', { name: /system prompt/i })
            .click()
        await configuration.getByRole('textbox').focus()
        await page.keyboard.press('Control+Enter')
        await page.keyboard.press('Shift+Enter')
        await expect(configuration).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(configuration).not.toBeVisible()
        await expect(draft).toHaveValue(/^UNSENT DRAFT /)
        const storedResults = await page.evaluate(async () => {
            const { useAppStore } = await import('/src/lib/store.ts')
            const store = useAppStore.getState()
            const session = store.sessions.find(
                (item) => item.id === store.activeSessionId
            )!
            return Object.values(session.results).flat()
        })
        expect(storedResults).toEqual([])
        expect(requests).toBe(0)
    } finally {
        await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve()))
        )
    }
})

test('image previews and context menus stay inside desktop and mobile windows', async ({
    page
}) => {
    await page.goto('/models')
    await page
        .getByRole('button', { name: 'Add provider', exact: true })
        .waitFor()
    await page.evaluate(async () => {
        const { useAppStore, storeHydration } =
            await import('/src/lib/store.ts')
        await storeHydration
        const model = useAppStore.getState().models[0]
        const canvas = document.createElement('canvas')
        canvas.width = 1800
        canvas.height = 2400
        const context = canvas.getContext('2d')!
        context.fillStyle = '#dde2eb'
        context.fillRect(0, 0, canvas.width, canvas.height)
        useAppStore.setState({
            activeModelIds: [model.id],
            activeSessionId: 'image-preview',
            sessions: [
                {
                    id: 'image-preview',
                    title: 'Preview',
                    models: [model.id],
                    messages: [],
                    createdAt: Date.now(),
                    results: {
                        [model.id]: [
                            {
                                id: 'image-result',
                                modelId: model.id,
                                prompt: 'Image',
                                response:
                                    '![Preview](' + canvas.toDataURL() + ')',
                                timestamp: Date.now(),
                                status: 'completed',
                                metrics: {
                                    ttft: 1,
                                    tps: 1,
                                    totalDuration: 1,
                                    tokenCount: 1
                                }
                            }
                        ]
                    }
                }
            ]
        })
    })
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    const image = page.getByRole('img', { name: 'Preview', exact: true })
    await expect(image).toBeVisible()
    const preview = page.getByRole('dialog', {
        name: 'Full size image',
        exact: true
    })
    for (const width of [1000, 390]) {
        await page.setViewportSize({ width, height: 700 })
        await image.click()
        await expect(preview).toBeVisible()
        await expect(
            preview.getByRole('button', { name: 'Close', exact: true })
        ).toBeInViewport({ ratio: 1 })
        await expect(
            preview.getByRole('button', { name: 'Download Image', exact: true })
        ).toBeInViewport({ ratio: 1 })
        const geometry = await preview.evaluate((element) => {
            const body = element.querySelector('[data-slot="dialog-body"]')!
            const image = element.querySelector('img')!
            const bounds = body.getBoundingClientRect()
            const imageBounds = image.getBoundingClientRect()
            const style = getComputedStyle(body)
            return {
                left: imageBounds.left - bounds.left,
                right: bounds.right - imageBounds.right,
                top: imageBounds.top - bounds.top,
                bottom: bounds.bottom - imageBounds.bottom,
                padding: Number.parseFloat(style.paddingLeft),
                overflow: body.scrollHeight - body.clientHeight
            }
        })
        for (const edge of [
            geometry.left,
            geometry.right,
            geometry.top,
            geometry.bottom
        ]) {
            expect(edge).toBeGreaterThanOrEqual(geometry.padding - 1)
        }
        expect(geometry.overflow).toBeLessThanOrEqual(1)
        await page.keyboard.press('Escape')
        await expect(preview).not.toBeVisible()
    }
    await image.evaluate((element) =>
        element.dispatchEvent(
            new MouseEvent('contextmenu', {
                bubbles: true,
                clientX: 385,
                clientY: 695
            })
        )
    )
    for (const name of ['View Full Size', 'Download Image', 'Copy Text']) {
        await expect(
            page.getByRole('button', { name, exact: true })
        ).toBeInViewport({ ratio: 1 })
    }
    await page
        .getByRole('button', { name: 'View Full Size', exact: true })
        .click()
    await expect(preview).toBeVisible()
    await preview.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(preview).not.toBeVisible()
})
