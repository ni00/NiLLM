import { expect, test, type Page } from '@playwright/test'

async function configureModel(page: Page, prices: boolean) {
    await page.goto('/models')
    await page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /^OpenAI / }) })
        .getByRole('button', { name: 'Deselect provider' })
        .click()
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor.getByLabel('Display Name').fill('Usage Model')
    await editor.getByLabel('Model ID', { exact: true }).fill('usage-model')
    await editor
        .getByLabel('Base URL (Optional override)')
        .fill('https://usage-provider.test/v1')
    if (prices) {
        await editor.getByLabel('Input price', { exact: true }).fill('2')
        await editor.getByLabel('Output price', { exact: true }).fill('4')
        await editor.getByLabel('Cache read price').fill('0.2')
        await editor.getByLabel('Cache write price').fill('2.5')
    }
    await editor
        .getByRole('button', { name: 'Save Model', exact: true })
        .click()
    await page.getByLabel('Search configured models').fill('Usage Model')
    await page
        .getByRole('switch', { name: 'Select Usage Model', exact: true })
        .click()
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
}

async function send(page: Page, index: number) {
    const input = page.getByPlaceholder(
        'Send a message to all models... (Use @ to mention models)'
    )
    await input.fill(`Round ${index}`)
    await input.press('Shift+Enter')
    await expect(
        page.getByText(`Usage response ${index}`, { exact: true })
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('response-metrics')).toHaveCount(index)
}

test('manual DeepSeek models use automatic prices while API-reported billing remains authoritative', async ({
    page
}) => {
    let calls = 0
    await page.route(
        'https://api.deepseek.com/v1/chat/completions',
        (route) => {
            calls++
            return route.fulfill({
                contentType: 'text/event-stream',
                body:
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: `Usage response ${calls}` }, finish_reason: null }] })}\n\n` +
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 10, prompt_cache_hit_tokens: 80, prompt_cache_miss_tokens: 20, ...(calls === 2 ? { cost: 0.012345 } : {}) } })}\n\ndata: [DONE]\n\n`
            })
        }
    )
    await page.goto('/models')
    await page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /^OpenAI / }) })
        .getByRole('button', { name: 'Deselect provider' })
        .click()
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor
        .getByRole('combobox', { name: 'Provider', exact: true })
        .click()
    await page.getByRole('button', { name: 'DeepSeek', exact: true }).click()
    await editor.getByLabel('Display Name').fill('DeepSeek Cost')
    await editor.getByLabel('Model ID', { exact: true }).fill('deepseek-flash')
    await expect(
        editor.getByLabel('Input price', { exact: true })
    ).toHaveAttribute('placeholder', 'Auto: 0.15')
    await expect(editor.getByLabel('Input price', { exact: true })).toHaveValue(
        ''
    )
    await editor
        .getByRole('button', { name: 'Save Model', exact: true })
        .click()
    await page
        .getByRole('switch', { name: 'Select DeepSeek Cost', exact: true })
        .click()
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    await send(page, 1)
    const first = page
        .getByTestId('response-metrics')
        .first()
        .getByTestId('usage-cost')
    await expect(first).toContainText('≈$0.00000924')
    await send(page, 2)
    const billed = page
        .getByTestId('response-metrics')
        .last()
        .getByTestId('usage-cost')
    await expect(billed).toContainText('$0.012345')
    await expect(billed).not.toContainText('≈')
    await expect(billed).toHaveAttribute(
        'title',
        'Cost reported by the provider (USD).'
    )
    await expect(
        page.getByTestId('column-metrics').getByTestId('usage-cost')
    ).toContainText('≈$0.01235424')
})

test('conversation shows cache discounts, weighted totals and persists usage after reload', async ({
    page
}, testInfo) => {
    let calls = 0
    const usages = [
        {
            prompt_tokens: 1000,
            completion_tokens: 100,
            prompt_cache_hit_tokens: 900
        },
        {
            prompt_tokens: 100,
            completion_tokens: 50,
            prompt_tokens_details: { cached_tokens: 10 }
        },
        { prompt_tokens: 50, completion_tokens: 10 }
    ]
    await page.route(
        'https://usage-provider.test/v1/chat/completions',
        (route) => {
            calls++
            return route.fulfill({
                contentType: 'text/event-stream',
                body:
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: `Usage response ${calls}` }, finish_reason: null }] })}\n\n` +
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: usages[calls - 1] })}\n\ndata: [DONE]\n\n`
            })
        }
    )
    await configureModel(page, true)
    const footer = page.getByTestId('column-metrics')
    await send(page, 1)
    const first = page.getByTestId('response-metrics').first()
    await expect(first.getByTestId('usage-cost')).toContainText('≈$0.00078')
    await expect(first.getByTestId('usage-cache')).toContainText('90.0%')
    await send(page, 2)
    await expect(
        page.getByTestId('response-metrics').last().getByTestId('usage-cache')
    ).toContainText('10.0%')
    await expect(footer.getByTestId('usage-cost')).toContainText('≈$0.001162')
    await expect(footer.getByTestId('usage-cache')).toContainText('82.7%')
    await send(page, 3)
    await expect(
        page.getByTestId('response-metrics').last().getByTestId('usage-cache')
    ).toContainText('—')
    await expect(footer.getByTestId('usage-cost')).toContainText('≈$0.001302')
    await expect(footer.getByTestId('usage-cache')).toHaveAttribute(
        'title',
        /2\/3 requests/
    )

    // Wait for the transaction, not a fixed delay, before rehydrating history.
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    new Promise<number>((resolve, reject) => {
                        const open = indexedDB.open('nillm-db', 1)
                        open.onerror = () => reject(open.error)
                        open.onsuccess = () => {
                            const db = open.result,
                                tx = db.transaction('store', 'readonly'),
                                store = tx.objectStore('store')
                            const keys = store.getAllKeys(),
                                values = store.getAll()
                            tx.oncomplete = () => {
                                let count = 0
                                keys.result.forEach((key, index) => {
                                    if (
                                        !String(key).startsWith(
                                            'nillm-session:'
                                        )
                                    )
                                        return
                                    const stored = JSON.parse(
                                        values.result[index]
                                    )
                                    const session = stored.state ?? stored
                                    const results = Object.values(
                                        session.results ?? {}
                                    ).flat() as Array<{
                                        status?: string
                                        metrics?: { cost?: number }
                                    }>
                                    count += results.filter(
                                        (entry) =>
                                            entry.status === 'completed' &&
                                            entry.metrics?.cost !== undefined
                                    ).length
                                })
                                db.close()
                                resolve(count)
                            }
                            tx.onerror = () => reject(tx.error)
                        }
                    })
            )
        )
        .toBe(3)
    await page.reload()
    await expect(footer.getByTestId('usage-cache')).toContainText('82.7%')
    await expect(footer.getByTestId('usage-cost')).toContainText('≈$0.001302')
    await page.screenshot({ path: testInfo.outputPath('usage-desktop.png') })
    await page.setViewportSize({ width: 420, height: 900 })
    const latest = page.getByTestId('response-metrics').last()
    await expect(latest.getByTestId('usage-cost')).toBeVisible()
    await expect(footer.getByTestId('usage-cache')).toBeVisible()
    expect(
        await latest.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1
        )
    ).toBe(true)
    expect(
        await footer.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1
        )
    ).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('usage-mobile.png') })
})

test('provider billing is shown without prices and missing billing stays unknown', async ({
    page
}) => {
    let calls = 0
    await page.route(
        'https://usage-provider.test/v1/chat/completions',
        (route) => {
            calls++
            return route.fulfill({
                contentType: 'text/event-stream',
                body:
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: `Usage response ${calls}` }, finish_reason: null }] })}\n\n` +
                    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 20, completion_tokens: 10, ...(calls === 1 && { cost: 0, prompt_tokens_details: { cached_tokens: 0 } }) } })}\n\ndata: [DONE]\n\n`
            })
        }
    )
    await configureModel(page, false)
    await send(page, 1)
    const first = page.getByTestId('response-metrics').first()
    await expect(first.getByTestId('usage-cost')).toContainText('$0.00')
    await expect(first.getByTestId('usage-cost')).toHaveAttribute(
        'title',
        'Cost reported by the provider (USD).'
    )
    await expect(first.getByTestId('usage-cache')).toContainText('0.0%')
    await send(page, 2)
    const second = page.getByTestId('response-metrics').last()
    await expect(second.getByTestId('usage-cost')).toContainText('—')
    await expect(second.getByTestId('usage-cache')).toContainText('—')
    await expect(
        page.getByTestId('column-metrics').getByTestId('usage-cost')
    ).toHaveAttribute('title', /1\/2 requests/)
})
