import { expect, test } from '@playwright/test'

test('statistics keep long labels readable, precise values and all paginated models', async ({
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
        const models = Array.from({ length: 36 }, (_, index) => ({
            id: `stats-${index}`,
            name: `vendor/model-with-a-very-long-name-${String(index).padStart(2, '0')}`,
            provider: 'custom' as const,
            providerId: 'stats-provider',
            providerName: 'Statistics provider with a very long name',
            enabled: true
        }))
        useAppStore.setState({
            models,
            sessions: [
                {
                    id: 'stats-history',
                    title: 'Stats history',
                    models: models.map((model) => model.id),
                    createdAt: Date.now(),
                    messages: [],
                    results: Object.fromEntries(
                        models.map((model, index) => [
                            model.id,
                            [
                                {
                                    id: `result-${index}`,
                                    modelId: model.id,
                                    prompt: 'Question',
                                    response: 'Answer',
                                    status: 'completed' as const,
                                    timestamp: Date.now(),
                                    metrics: {
                                        ttft: 822.98765 + index,
                                        tps: 52.649536448774064 + index,
                                        totalDuration: 1024.82645,
                                        tokenCount: 120,
                                        inputTokens: 20,
                                        outputTokens: 100,
                                        tokenSource: 'api' as const,
                                        cost: 0.000001,
                                        costSource: 'api' as const
                                    }
                                }
                            ]
                        ])
                    )
                }
            ]
        })
    })
    await page.getByRole('link', { name: 'Stats', exact: true }).click()
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(25)
    await expect(page.locator('.recharts-wrapper')).toHaveCount(0)
    const speeds = page.locator('[data-stats-bar="speed"]')
    const latencies = page.locator('[data-stats-bar="latency"]')
    await expect(speeds).toHaveCount(12)
    await expect(latencies).toHaveCount(12)
    // Latency ranks independently: the fastest response is outside the top speeds.
    await expect(latencies.first()).toContainText(
        'model-with-a-very-long-name-00'
    )
    await expect(latencies.first()).toContainText('822.99')
    await expect(speeds.first()).toContainText('87.65')
    const mutations = await page.evaluate(async () => {
        const { useAppStore } = await import('/src/lib/store.ts')
        const target = document.querySelector('[data-stats-performance]')!
        let count = 0
        const observer = new MutationObserver((records) => {
            count += records.length
        })
        observer.observe(target, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true
        })
        try {
            for (let chunk = 0; chunk < 10; chunk++) {
                for (let model = 0; model < 8; model++) {
                    useAppStore.getState().setStreamingData(`live-${model}`, {
                        response: 'Live chunk '.repeat(chunk + 1)
                    })
                }
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => resolve())
                )
            }
            return count
        } finally {
            observer.disconnect()
            useAppStore.getState().clearAllStreamingData()
        }
    })
    expect(mutations).toBe(0)
    await expect(
        page.getByText('<$0.01', { exact: true }).first()
    ).toBeVisible()
    const qualities = page
        .locator('[data-stats-capabilities] [data-stats-value]')
        .allTextContents()
    expect((await qualities).filter((value) => value === '—')).toHaveLength(12)
    for (const value of await page
        .locator('[data-stats-value]')
        .allTextContents()) {
        expect(value).not.toMatch(/\.\d{3}/)
    }
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(rows).toHaveCount(11)
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
    await page
        .getByRole('button', { name: 'Sort by avgTPS', exact: true })
        .click()
    await expect(rows).toHaveCount(25)
    await expect(rows.first()).toContainText('model-with-a-very-long-name-00')
    await expect(rows.first()).toContainText('52.65')
    await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()

    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 })
        const geometry = await speeds.first().evaluate((element) => {
            const label = element
                .querySelector('p[title]')!
                .getBoundingClientRect()
            const value = element
                .querySelector('[data-stats-value]')!
                .getBoundingClientRect()
            return {
                labelRight: label.right,
                valueLeft: value.left,
                overflow: document.documentElement.scrollWidth
            }
        })
        expect(geometry.labelRight).toBeLessThan(geometry.valueLeft)
        expect(geometry.overflow).toBeLessThanOrEqual(width)
    }

    await page
        .getByRole('combobox', { name: 'Model mode', exact: true })
        .click()
    await page.getByRole('button', { name: 'Image', exact: true }).click()
    await expect(rows).toHaveCount(0)
    await page
        .getByRole('combobox', { name: 'Model mode', exact: true })
        .click()
    await page.getByRole('button', { name: 'Chat', exact: true }).click()
    await expect(rows).toHaveCount(25)
    await expect(latencies.first()).toContainText('822.99')
    await page.evaluate(async () => {
        const { useAppStore } = await import('/src/lib/store.ts')
        useAppStore.getState().setLanguage('zh')
    })
    await expect(
        page.getByRole('heading', { name: '参评模型', exact: true })
    ).toBeVisible()
    const headerHeights = await page
        .locator('thead button')
        .evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect().height)
        )
    expect(headerHeights.every((height) => height <= 24)).toBe(true)
})
