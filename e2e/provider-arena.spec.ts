import { expect, test } from '@playwright/test'

test('provider to arena works through the UI with a bundled worker', async ({
    page
}) => {
    await page.route('https://mock-provider.test/v1/models', (route) =>
        route.fulfill({
            json: { data: [{ id: 'mock-chat', name: 'Mock Chat' }] }
        })
    )
    await page.route(
        'https://mock-provider.test/v1/chat/completions',
        (route) =>
            route.fulfill({
                contentType: 'text/event-stream',
                body:
                    'data: ' +
                    JSON.stringify({
                        choices: [
                            {
                                index: 0,
                                delta: { content: 'Bundled worker completed.' },
                                finish_reason: null
                            }
                        ]
                    }) +
                    '\n\ndata: ' +
                    JSON.stringify({
                        choices: [
                            { index: 0, delta: {}, finish_reason: 'stop' }
                        ],
                        usage: {
                            prompt_tokens: 3,
                            completion_tokens: 6,
                            total_tokens: 9
                        }
                    }) +
                    '\n\ndata: [DONE]\n\n'
            })
    )
    await page.goto('/models')
    const openai = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /^OpenAI / }) })
    await openai.getByRole('button', { name: 'Deselect provider' }).click()
    await page
        .getByRole('button', { name: 'Add provider', exact: true })
        .click()
    const dialog = page.getByRole('dialog')
    await dialog
        .getByRole('combobox', { name: 'Provider', exact: true })
        .click()
    await page.getByText('Custom (OpenAI Compatible)', { exact: true }).click()
    await dialog.getByLabel('Provider display name').fill('Mock Provider')
    await dialog.getByLabel('Base URL').fill('https://mock-provider.test/v1')
    await dialog
        .getByRole('button', { name: 'Fetch models', exact: true })
        .click()
    await dialog.getByRole('button', { name: 'Add 1 models' }).click()
    const provider = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /^Mock Provider / }) })
    await provider.getByRole('button', { name: 'Select provider' }).click()
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    const input = page.getByPlaceholder(
        'Send a message to all models... (Use @ to mention models)'
    )
    await input.fill('Test production streaming')
    await input.press('Shift+Enter')
    await expect(
        page.getByText('Bundled worker completed.', { exact: true })
    ).toBeVisible({ timeout: 15000 })
    await page.getByRole('link', { name: 'Stats' }).click()
    await expect(page.getByText('100%', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('In 3 / Out 6')).toBeVisible()
})
