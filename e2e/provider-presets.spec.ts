import { expect, test, type Page } from '@playwright/test'

async function persistedModels(page: Page) {
    return page.evaluate(
        () =>
            new Promise<
                Array<{
                    id: string
                    provider: string
                    providerId?: string
                    name: string
                    mode?: string
                    decisionProtocol?: string
                    config?: { maxTokens?: number }
                    capabilities?: {
                        unsupportedParameters?: string[]
                        chatProtocol?: string
                    }
                }>
            >((resolve, reject) => {
                const open = indexedDB.open('nillm-db', 1)
                open.onerror = () => reject(open.error)
                open.onsuccess = () => {
                    const db = open.result
                    const tx = db.transaction('store', 'readonly')
                    const get = tx.objectStore('store').get('nillm-meta')
                    get.onsuccess = () =>
                        resolve(
                            (get.result
                                ? JSON.parse(get.result).state.models
                                : []
                            ).map(
                                ({
                                    id,
                                    provider,
                                    providerId,
                                    name,
                                    mode,
                                    decisionProtocol,
                                    config,
                                    capabilities
                                }: {
                                    id: string
                                    provider: string
                                    providerId?: string
                                    name: string
                                    mode?: string
                                    decisionProtocol?: string
                                    config?: { maxTokens?: number }
                                    capabilities?: {
                                        unsupportedParameters?: string[]
                                        chatProtocol?: string
                                    }
                                }) => ({
                                    id,
                                    provider,
                                    providerId,
                                    name,
                                    mode,
                                    decisionProtocol,
                                    config,
                                    capabilities
                                })
                            )
                        )
                    tx.oncomplete = () => db.close()
                    tx.onerror = () => reject(tx.error)
                }
            })
    )
}

async function chooseProvider(page: Page, name: string, query: string) {
    await page
        .getByRole('dialog')
        .getByRole('combobox', { name: 'Provider', exact: true })
        .click()
    await page
        .getByRole('textbox', { name: 'Search options', exact: true })
        .fill(query)
    await page.getByRole('button', { name, exact: true }).click()
}

test('offline presets import, persist and run with unsupported sampling excluded', async ({
    page
}) => {
    let discoveryCalls = 0
    const bodies: Record<string, unknown>[] = []
    await page.route('https://api.moonshot.ai/v1/models', (route) => {
        discoveryCalls++
        return route.abort()
    })
    await page.route('https://api.moonshot.ai/v1/chat/completions', (route) => {
        bodies.push(route.request().postDataJSON())
        return route.fulfill({
            contentType: 'text/event-stream',
            body:
                `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'Preset completed.' }, finish_reason: null }] })}\n\n` +
                `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } })}\n\n` +
                'data: [DONE]\n\n'
        })
    })
    await page.goto('/models')
    await page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /^OpenAI / }) })
        .getByRole('button', { name: 'Deselect provider' })
        .click()
    await page
        .getByRole('button', { name: 'Add provider', exact: true })
        .click()
    await chooseProvider(page, 'Moonshot AI (International)', 'moonshot')
    const dialog = page.getByRole('dialog')
    await expect(
        dialog.getByLabel('Base URL', { exact: true })
    ).toHaveAttribute('placeholder', 'https://api.moonshot.ai/v1')
    await dialog
        .getByRole('button', { name: 'Use presets (2)', exact: true })
        .click()
    await dialog
        .getByRole('button', { name: 'Clear selection', exact: true })
        .click()
    await dialog.getByLabel('Search discovered models').fill('kimi-k3')
    await dialog
        .getByRole('button', { name: 'Select filtered', exact: true })
        .click()
    await dialog
        .getByRole('button', { name: 'Add 1 models', exact: true })
        .click()
    await page.getByLabel('Search configured models').fill('Kimi K3')
    await page
        .getByRole('switch', { name: 'Select Kimi K3', exact: true })
        .click()
    await expect
        .poll(
            async () =>
                (await persistedModels(page)).find(
                    (model) => model.providerId === 'kimi-k3'
                )?.config?.maxTokens
        )
        .toBe(4096)
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    const input = page.getByPlaceholder(
        'Send a message to all models... (Use @ to mention models)'
    )
    await input.fill('Check the model preset')
    await input.press('Shift+Enter')
    await expect(
        page.getByText('Preset completed.', { exact: true })
    ).toBeVisible({ timeout: 15000 })
    expect(discoveryCalls).toBe(0)
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toMatchObject({ model: 'kimi-k3', max_tokens: 4096 })
    expect(bodies[0]).not.toHaveProperty('temperature')
    await page.getByRole('link', { name: 'Models', exact: true }).click()
    await page.reload()
    await page.getByLabel('Search configured models').fill('Kimi K3')
    await page
        .locator('[data-model-id]')
        .filter({ hasText: 'Kimi K3' })
        .getByTitle('Edit', { exact: true })
        .click()
    await expect(
        page
            .getByRole('dialog')
            .getByRole('checkbox', { name: 'temperature', exact: true })
    ).toBeChecked()
})

test('manual model presets preserve native protocols and reset settings when changing providers', async ({
    page
}) => {
    await page.goto('/models')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await chooseProvider(page, 'MiniMax (China)', 'minimax')
    const editor = page.getByRole('dialog')
    await editor
        .getByRole('combobox', { name: 'Model preset', exact: true })
        .click()
    await page
        .getByRole('button', {
            name: 'MiniMax-M2.7 · MiniMax-M2.7',
            exact: true
        })
        .click()
    await expect(editor.getByLabel('Model ID', { exact: true })).toHaveValue(
        'MiniMax-M2.7'
    )
    await expect(
        editor.getByLabel('Base URL (Optional override)')
    ).toHaveAttribute('placeholder', 'https://api.minimax.cn/anthropic/v1')
    await expect(
        editor.getByRole('checkbox', { name: 'seed', exact: true })
    ).toBeChecked()
    await editor.getByLabel('API Key (Optional override)').fill('test-only-key')
    await editor
        .getByLabel('Base URL (Optional override)')
        .fill('https://custom-minimax.test/anthropic/v1')
    await editor
        .getByRole('button', { name: 'Save Model', exact: true })
        .click()
    await page.getByLabel('Search configured models').fill('MiniMax-M2.7')
    await page
        .locator('[data-model-id]')
        .filter({ hasText: 'MiniMax-M2.7' })
        .getByTitle('Edit', { exact: true })
        .click()
    await chooseProvider(page, 'Vercel AI Gateway', 'vercel')
    await expect(editor.getByLabel('API Key (Optional override)')).toHaveValue(
        ''
    )
    await expect(editor.getByLabel('Base URL (Optional override)')).toHaveValue(
        ''
    )
    await editor
        .getByRole('combobox', { name: 'Model preset', exact: true })
        .click()
    await page
        .getByRole('button', {
            name: 'Jev (System One) · typesafe-ai/jev',
            exact: true
        })
        .click()
    await expect(
        editor.getByRole('combobox', { name: 'Model mode' })
    ).toHaveText(/Decision/)
    await expect(
        editor.getByRole('combobox', { name: 'Decision API' })
    ).toHaveText(/System One/)
    await editor
        .getByRole('button', { name: 'Update Configuration', exact: true })
        .click()
    await expect
        .poll(
            async () =>
                (await persistedModels(page)).find(
                    (model) => model.providerId === 'typesafe-ai/jev'
                )?.decisionProtocol
        )
        .toBe('system-one')
    await page.reload()
    await page.getByLabel('Search configured models').fill('typesafe-ai/jev')
    await expect(
        page.getByText('typesafe-ai/jev', { exact: true })
    ).toBeVisible()
})

for (const gateway of [
    {
        provider: 'commandcode',
        label: 'Command Code (GOAT)',
        baseURL: 'https://api.commandcode.ai/provider/v1',
        count: 4,
        chatNames: ['DeepSeek V4.1 Flash', 'Claude Sonnet 4.6'],
        jev: 'typesafe/jev'
    },
    {
        provider: 'zenmux',
        label: 'ZenMux',
        baseURL: 'https://zenmux.ai/api/v1',
        count: 3,
        chatNames: ['Kimi K2.6', 'Claude Sonnet 4.6'],
        jev: 'typesafe/jev-latest'
    }
]) {
    test(`${gateway.label} presets persist and run multiple chat protocols through the worker`, async ({
        page
    }) => {
        const calls: {
            url: string
            headers: Record<string, string>
            body: Record<string, unknown>
        }[] = []
        await page.route(`${gateway.baseURL}/chat/completions`, (route) => {
            calls.push({
                url: route.request().url(),
                headers: route.request().headers(),
                body: route.request().postDataJSON()
            })
            return route.fulfill({
                contentType: 'text/event-stream',
                body:
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'Gateway chat completed.' }, finish_reason: null }] })}\n\n` +
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 4, total_tokens: 104, prompt_tokens_details: { cached_tokens: 80 }, cost: 0.00123 } })}\n\n` +
                    'data: [DONE]\n\n'
            })
        })
        await page.route(`${gateway.baseURL}/messages`, (route) => {
            calls.push({
                url: route.request().url(),
                headers: route.request().headers(),
                body: route.request().postDataJSON()
            })
            const events = [
                {
                    type: 'message_start',
                    message: {
                        id: 'msg',
                        type: 'message',
                        role: 'assistant',
                        model: 'claude-sonnet-4-6',
                        content: [],
                        stop_reason: null,
                        stop_sequence: null,
                        usage: {
                            input_tokens: 20,
                            cache_read_input_tokens: 80,
                            output_tokens: 0
                        }
                    }
                },
                {
                    type: 'content_block_start',
                    index: 0,
                    content_block: { type: 'text', text: '' }
                },
                {
                    type: 'content_block_delta',
                    index: 0,
                    delta: {
                        type: 'text_delta',
                        text: 'Gateway messages completed.'
                    }
                },
                { type: 'content_block_stop', index: 0 },
                {
                    type: 'message_delta',
                    delta: { stop_reason: 'end_turn', stop_sequence: null },
                    usage: { output_tokens: 4, cost: 0.00123 }
                },
                { type: 'message_stop' }
            ]
            return route.fulfill({
                contentType: 'text/event-stream',
                body: events
                    .map(
                        (event) =>
                            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                    )
                    .join('')
            })
        })
        await page.goto('/models')
        await page
            .locator('section')
            .filter({ has: page.getByRole('heading', { name: /^OpenAI / }) })
            .getByRole('button', { name: 'Deselect provider' })
            .click()
        await page
            .getByRole('button', { name: 'Add provider', exact: true })
            .click()
        await chooseProvider(page, gateway.label, gateway.provider)
        const dialog = page.getByRole('dialog')
        await expect(
            dialog.getByLabel('Base URL', { exact: true })
        ).toHaveAttribute('placeholder', gateway.baseURL)
        await dialog
            .getByLabel('API key', { exact: true })
            .fill('gateway-test-key')
        await dialog
            .getByRole('button', {
                name: `Use presets (${gateway.count})`,
                exact: true
            })
            .click()
        await dialog
            .getByRole('button', {
                name: `Add ${gateway.count} models`,
                exact: true
            })
            .click()
        await expect
            .poll(
                async () =>
                    (await persistedModels(page)).find(
                        (m) => m.providerId === gateway.jev
                    )?.decisionProtocol
            )
            .toBe('system-one')
        await page.reload()
        for (const name of gateway.chatNames) {
            await page.getByLabel('Search configured models').fill(name)
            await page
                .getByRole('switch', { name: `Select ${name}`, exact: true })
                .click()
        }
        const claude = (await persistedModels(page)).find(
            (m) =>
                m.provider === gateway.provider &&
                m.name === 'Claude Sonnet 4.6'
        )!
        if (gateway.provider === 'commandcode')
            expect(claude.capabilities?.chatProtocol).toBe('anthropic')
        await page.getByRole('link', { name: 'Arena', exact: true }).click()
        const input = page.getByPlaceholder(
            'Send a message to all models... (Use @ to mention models)'
        )
        await input.fill('Test both gateway models')
        await input.press('Shift+Enter')
        await expect(
            page.getByText('Gateway chat completed.', { exact: true })
        ).toHaveCount(gateway.provider === 'commandcode' ? 1 : 2, {
            timeout: 15000
        })
        if (gateway.provider === 'commandcode')
            await expect(
                page.getByText('Gateway messages completed.', { exact: true })
            ).toBeVisible()
        const chatMetrics = page.getByTestId('response-metrics').filter({
            has: page.getByTestId('usage-cost').filter({ hasText: '$0.00123' })
        })
        await expect(chatMetrics).toHaveCount(2)
        for (const metrics of await chatMetrics.all()) {
            await expect(metrics.getByTestId('usage-cost')).toHaveAttribute(
                'title',
                'Cost reported by the provider (USD).'
            )
            await expect(metrics.getByTestId('usage-cache')).toContainText(
                '80.0%'
            )
        }
        expect(calls).toHaveLength(2)
        for (const call of calls) {
            expect(call.body).toHaveProperty('max_tokens', 4096)
            expect(
                call.headers[
                    call.url.endsWith('/messages')
                        ? 'x-api-key'
                        : 'authorization'
                ]
            ).toBe(
                call.url.endsWith('/messages')
                    ? 'gateway-test-key'
                    : 'Bearer gateway-test-key'
            )
            if (String(call.body.model).includes('kimi'))
                expect(call.body).not.toHaveProperty('temperature')
        }
    })
}
