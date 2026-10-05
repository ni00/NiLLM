import { expect, test, type Page } from '@playwright/test'

function answersFor(state: unknown) {
    const text = String(state)
    const department = text.includes('charged')
        ? 'billing'
        : text.includes('API')
          ? 'technical'
          : 'sales'
    const urgency = text.includes('today')
        ? 2
        : text.includes('tomorrow')
          ? 1
          : 0
    return {
        department: {
            type: 'choice',
            choice: department,
            probabilities: Object.fromEntries(
                ['billing', 'technical', 'sales'].map((option) => [
                    option,
                    option === department ? 1 : 0
                ])
            ),
            confidence: 1
        },
        urgent: { type: 'noul', noul: urgency === 2 ? 0.99 : 0.01 },
        urgency: {
            type: 'score',
            score: urgency,
            probabilities: Object.fromEntries(
                [0, 1, 2].map((level) => [
                    String(level),
                    level === urgency ? 1 : 0
                ])
            ),
            confidence: 1,
            legend: { '0': 'No deadline', '1': 'This week', '2': 'Today' }
        }
    }
}

async function configureModels(page: Page) {
    await page.goto('/models')
    await page
        .locator('[data-model-id="gpt-4o"]')
        .getByTitle('Edit', { exact: true })
        .click()
    const editor = page.getByRole('dialog')
    await editor
        .getByLabel('Display Name', { exact: true })
        .fill('OpenAI Decisions')
    await editor.getByRole('combobox', { name: 'Model mode' }).click()
    await page.getByRole('button', { name: 'Decision', exact: true }).click()
    await editor
        .getByLabel('Base URL (Optional override)')
        .fill('https://openai-decision.test/v1')
    await editor.getByRole('button', { name: 'Update Configuration' }).click()
    await page
        .getByRole('button', { name: 'Add provider', exact: true })
        .click()
    const provider = page.getByRole('dialog')
    await provider
        .getByRole('combobox', { name: 'Provider', exact: true })
        .click()
    await page
        .getByRole('button', { name: 'TypeSafe (Jev)', exact: true })
        .click()
    await provider
        .getByLabel('Base URL', { exact: true })
        .fill('https://jev-decision.test/v1')
    await provider
        .getByRole('button', { name: 'Fetch models', exact: true })
        .click()
    await provider.getByRole('button', { name: 'Add 1 models' }).click()
    await page
        .getByRole('switch', { name: 'Select jev-latest', exact: true })
        .click()
}

test('Jev and OpenAI decision arena, scored experiments and recovery work with the production worker', async ({
    page
}) => {
    const requests: { kind: string; body: Record<string, unknown> }[] = []
    await page.route('https://jev-decision.test/v1/models', (route) =>
        route.fulfill({
            json: {
                models: [
                    {
                        name: 'jev-latest',
                        description: 'Fixture',
                        release_date: '2026-09-15'
                    }
                ]
            }
        })
    )
    await page.route('https://jev-decision.test/v1/systemone', (route) => {
        const body = route.request().postDataJSON()
        requests.push({ kind: 'jev', body })
        return route.fulfill({
            json: {
                model: 'jev-fixture-version',
                answers: answersFor(body.state),
                usage: { input_tokens: 100, output_tokens: 30 }
            }
        })
    })
    await page.route(
        'https://openai-decision.test/v1/chat/completions',
        (route) => {
            const body = route.request().postDataJSON()
            requests.push({ kind: 'openai', body })
            const request = JSON.parse(body.messages.at(-1).content)
            return route.fulfill({
                json: {
                    id: 'fixture',
                    model: 'gpt-fixture-version',
                    created: 1,
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: JSON.stringify({
                                    answers: answersFor(request.state)
                                })
                            },
                            finish_reason: 'stop'
                        }
                    ],
                    usage: {
                        prompt_tokens: 200,
                        completion_tokens: 100,
                        total_tokens: 300
                    }
                }
            })
        }
    )
    await configureModels(page)
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    await page.getByRole('button', { name: 'Edit decision input' }).click()
    const composer = page.getByRole('dialog')
    await expect(composer.getByLabel('State', { exact: true })).toHaveValue(
        /charged twice/
    )
    await composer.getByRole('button', { name: 'Apply decision input' }).click()
    const input = page.getByPlaceholder(
        'Enter a decision task with state and questions, or use the decision editor.'
    )
    const task = await input.inputValue()
    await input.press('Shift+Enter')
    await expect(page.getByTestId('decision-response')).toHaveCount(2)
    await expect(
        page.getByText('Provider confidence:', { exact: false }).first()
    ).toBeVisible()
    await expect(
        page.getByText('Self-reported confidence:', { exact: false }).first()
    ).toBeVisible()
    await expect(
        page.getByText('Resolved model: jev-fixture-version')
    ).toBeVisible()
    await expect(page.getByText('TTFT', { exact: true })).toHaveCount(0)
    await page.screenshot({
        path: 'test-results/decisions-arena.png',
        fullPage: true
    })

    await input.fill('{}')
    await expect(
        page.getByRole('button', { name: 'Send message' })
    ).toBeDisabled()
    await input.press('Shift+Enter')
    expect(requests).toHaveLength(2)
    await input.fill(task)
    await input.press('Shift+Enter')
    await expect.poll(() => requests.length).toBe(4)
    // Earlier arena answers collapse when the next result becomes current.
    await expect(page.getByTestId('decision-response')).toHaveCount(2)
    expect(
        requests
            .filter((request) => request.kind === 'openai')
            .every(
                (request) => (request.body.messages as unknown[]).length === 2
            )
    ).toBe(true)
    expect(
        requests
            .filter((request) => request.kind === 'jev')
            .every(
                (request) =>
                    Object.keys(request.body).sort().join(',') ===
                    'model,questions,state'
            )
    ).toBe(true)

    await page.getByRole('link', { name: 'Tests', exact: true }).click()
    // Locate the card by its content so built-in list order can change.
    const heading = page.getByText(
        'Decision models: support routing and urgency',
        { exact: true }
    )
    await expect(heading).toBeVisible()
    const card = heading.locator(
        'xpath=ancestor::*[contains(@class,"group")][1]'
    )
    await card
        .getByRole('button', { name: 'Run Batch Evaluation', exact: true })
        .click()
    const dialog = page.getByRole('dialog')
    await dialog
        .getByRole('checkbox', {
            name: 'OpenAI Decisions (decision)',
            exact: true
        })
        .check()
    await dialog
        .getByRole('checkbox', { name: 'jev-latest (decision)', exact: true })
        .check()
    await dialog.getByRole('button', { name: 'Next', exact: true }).click()
    await dialog.getByRole('button', { name: 'Next', exact: true }).click()
    await dialog.getByRole('button', { name: 'Create Experiment' }).click()
    await expect(
        page.getByText('completed', { exact: true }).first()
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Rule scoring: 6\/6/).first()).toBeVisible()
    await page.screenshot({
        path: 'test-results/decisions-experiment.png',
        fullPage: true
    })
    await page.waitForTimeout(350)
    await page.reload()
    await expect(
        page.getByText('completed', { exact: true }).first()
    ).toBeVisible()
    await expect(page.getByText(/Rule scoring: 6\/6/).first()).toBeVisible()
    expect(requests).toHaveLength(10)
})

test('OpenRouter and Vercel System One compete with OpenAI Responses and retain historical statistics', async ({
    page
}) => {
    const requests: { kind: string; body: Record<string, unknown> }[] = []
    await page.route('https://router-decision.test/api/v1/models*', (route) =>
        route.fulfill({
            json: {
                data: [
                    {
                        id: 'typesafe/jev-1.13',
                        name: 'Router Jev',
                        architecture: { output_modalities: ['decisions'] },
                        pricing: { prompt: '0.000000042', completion: '0' }
                    }
                ]
            }
        })
    )
    await page.route('https://vercel-decision.test/v1/models', (route) =>
        route.fulfill({
            json: {
                data: [
                    {
                        id: 'typesafe-ai/jev',
                        name: 'Vercel Jev',
                        type: 'evaluation',
                        pricing: { input: '0.000000042', output: '0' }
                    }
                ]
            }
        })
    )
    for (const [kind, url] of [
        ['router', 'https://router-decision.test/api/alpha/decisions'],
        ['vercel', 'https://vercel-decision.test/typesafe/v1/systemone']
    ]) {
        await page.route(url, (route) => {
            const body = route.request().postDataJSON()
            requests.push({ kind, body })
            return route.fulfill({
                json: {
                    model: `${kind}-jev-version`,
                    answers: answersFor(body.state),
                    usage: {
                        input_tokens: 100,
                        output_tokens: 30,
                        cost: 0.00001
                    }
                }
            })
        })
    }
    await page.route(
        'https://responses-decision.test/v1/responses',
        (route) => {
            const body = route.request().postDataJSON()
            requests.push({ kind: 'responses', body })
            const task = JSON.parse(body.input[0].content[0].text)
            return route.fulfill({
                json: {
                    model: 'responses-version',
                    status: 'completed',
                    output: [
                        {
                            type: 'message',
                            content: [
                                {
                                    type: 'output_text',
                                    text: JSON.stringify({
                                        answers: answersFor(task.state)
                                    })
                                }
                            ]
                        }
                    ],
                    usage: {
                        input_tokens: 200,
                        output_tokens: 100,
                        output_tokens_details: { reasoning_tokens: 10 }
                    }
                }
            })
        }
    )

    await page.goto('/models')
    await page
        .locator('[data-model-id="gpt-4o"]')
        .getByTitle('Edit', { exact: true })
        .click()
    const editor = page.getByRole('dialog')
    await editor
        .getByLabel('Display Name', { exact: true })
        .fill('OpenAI Responses Decisions')
    await editor.getByRole('combobox', { name: 'Model mode' }).click()
    await page.getByRole('button', { name: 'Decision', exact: true }).click()
    await editor
        .getByRole('combobox', { name: 'Decision API', exact: true })
        .click()
    await page
        .getByRole('button', { name: 'OpenAI Responses', exact: true })
        .click()
    await editor
        .getByLabel('Base URL (Optional override)')
        .fill('https://responses-decision.test/v1')
    await editor.getByRole('button', { name: 'Update Configuration' }).click()
    for (const [provider, baseURL, name] of [
        ['OpenRouter', 'https://router-decision.test/api/v1', 'Router Jev'],
        ['Vercel AI Gateway', 'https://vercel-decision.test/v1', 'Vercel Jev']
    ]) {
        await page
            .getByRole('button', { name: 'Add provider', exact: true })
            .click()
        const dialog = page.getByRole('dialog')
        await dialog
            .getByRole('combobox', { name: 'Provider', exact: true })
            .click()
        await page.getByRole('button', { name: provider, exact: true }).click()
        await dialog.getByLabel('Base URL', { exact: true }).fill(baseURL)
        await dialog
            .getByRole('button', { name: 'Fetch models', exact: true })
            .click()
        await dialog.getByRole('button', { name: 'Add 1 models' }).click()
        await page
            .getByRole('switch', { name: `Select ${name}`, exact: true })
            .click()
    }
    // Wait for the durable selection before testing a fresh page load.
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    new Promise<boolean>((resolve, reject) => {
                        const open = indexedDB.open('nillm-db', 1)
                        open.onerror = () => reject(open.error)
                        open.onsuccess = () => {
                            const db = open.result
                            const tx = db.transaction('store', 'readonly')
                            const get = tx
                                .objectStore('store')
                                .get('nillm-meta')
                            get.onsuccess = () => {
                                const meta = get.result
                                    ? JSON.parse(get.result)
                                    : undefined
                                const jev = meta?.state.models.find(
                                    (model: { name: string }) =>
                                        model.name === 'Vercel Jev'
                                )
                                resolve(
                                    !!jev &&
                                        meta.state.activeModelIds.includes(
                                            jev.id
                                        )
                                )
                            }
                            tx.oncomplete = () => db.close()
                            tx.onerror = () => reject(tx.error)
                        }
                    })
            )
        )
        .toBe(true)
    await page.reload()
    await expect(
        page.getByRole('switch', { name: 'Select Vercel Jev', exact: true })
    ).toBeChecked()
    await page.getByRole('link', { name: 'Arena', exact: true }).click()
    await page.getByRole('button', { name: 'Edit decision input' }).click()
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Apply decision input' })
        .click()
    await page
        .getByPlaceholder(
            'Enter a decision task with state and questions, or use the decision editor.'
        )
        .press('Shift+Enter')
    await expect(page.getByTestId('decision-response')).toHaveCount(3)
    expect(requests).toHaveLength(3)
    const native = requests.filter((request) => request.kind !== 'responses')
    expect(
        native.every(
            (request) =>
                Object.keys(request.body).sort().join(',') ===
                'model,questions,state'
        )
    ).toBe(true)
    expect(
        requests.find((request) => request.kind === 'responses')?.body
    ).toMatchObject({
        store: false,
        text: { format: { type: 'json_schema', strict: true } }
    })

    await page.getByRole('link', { name: 'Tests', exact: true }).click()
    const card = page
        .getByText('Decision models: support routing and urgency', {
            exact: true
        })
        .locator('xpath=ancestor::*[contains(@class,"group")][1]')
    await card
        .getByRole('button', { name: 'Run Batch Evaluation', exact: true })
        .click()
    const experiment = page.getByRole('dialog')
    for (const name of [
        'OpenAI Responses Decisions',
        'Router Jev',
        'Vercel Jev'
    ]) {
        await experiment
            .getByRole('checkbox', { name: `${name} (decision)`, exact: true })
            .check()
    }
    await experiment.getByRole('button', { name: 'Next', exact: true }).click()
    await experiment.getByRole('button', { name: 'Next', exact: true }).click()
    await experiment.getByRole('button', { name: 'Create Experiment' }).click()
    await expect(
        page.getByText('completed', { exact: true }).first()
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Rule scoring: 9\/9/).first()).toBeVisible()
    expect(requests).toHaveLength(12)

    // Editing the live identity must not relabel the earlier arena record.
    await page.getByRole('link', { name: 'Models', exact: true }).click()
    await page
        .locator('[data-model-id="gpt-4o"]')
        .getByTitle('Edit', { exact: true })
        .click()
    await page
        .getByRole('dialog')
        .getByLabel('Display Name', { exact: true })
        .fill('Renamed live model')
    await page
        .getByRole('dialog')
        .getByRole('combobox', { name: 'Model mode' })
        .click()
    await page
        .getByRole('button', { name: 'Image Generation', exact: true })
        .click()
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Update Configuration' })
        .click()
    await page.getByRole('link', { name: 'Stats', exact: true }).click()
    await expect(
        page.getByText('OpenAI Responses Decisions', { exact: true }).first()
    ).toBeVisible()
    await expect(
        page.getByText('Renamed live model', { exact: true })
    ).toHaveCount(0)
})
