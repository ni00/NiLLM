import { expect, test, type Page } from '@playwright/test'

async function seed(page: Page, count: number, providers = 1) {
    await page.goto('/models')
    const models = Array.from({ length: count }, (_, index) => ({
        id: `scroll-${index}`,
        name: `Scroll Model ${String(index).padStart(4, '0')}`,
        provider: 'custom',
        providerName: `Scroll Provider ${Math.floor(index / (count / providers))}`,
        providerId: `model-${index}`,
        baseURL: 'https://mock-provider.test/v1',
        enabled: true
    }))
    await page.getByTitle('Delete', { exact: true }).first().click()
    await page.getByTitle('Delete', { exact: true }).first().click()
    await page.locator('#import-models').setInputFiles({
        name: 'scroll-models.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(models))
    })
    await expect(
        page.getByRole('heading', { name: 'Scroll Model 0000', exact: true })
    ).toBeVisible()
}

test('large model catalogs stay bounded while scrolling, searching and resizing', async ({
    page
}) => {
    await seed(page, 1200, 6)
    const viewport = page.getByRole('region', { name: 'Model list' })
    const cards = page.locator('[data-model-id]')
    expect(await cards.count()).toBeLessThan(60)
    await expect(page.getByRole('button', { name: /^Drag / })).toHaveCount(0)
    await viewport.evaluate((element) => {
        element.scrollTop = element.scrollHeight
    })
    await expect(
        page.getByRole('heading', { name: 'Scroll Model 1199', exact: true })
    ).toBeVisible()
    expect(await cards.count()).toBeLessThan(60)
    await page
        .getByRole('textbox', { name: 'Search configured models' })
        .fill('Scroll Provider 3')
    await expect(
        page.getByRole('heading', { name: /^Scroll Provider 3 / })
    ).toBeVisible()
    await page
        .getByRole('button', { name: 'Select provider', exact: true })
        .click()
    await expect(page.getByText('200 models · 200 active')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(390)
    expect(await cards.count()).toBeLessThan(20)
    await viewport.evaluate((element) => {
        element.scrollTop = element.scrollHeight
    })
    await expect(
        page.getByRole('heading', { name: 'Scroll Model 0799', exact: true })
    ).toBeVisible()
    await expect(
        page.getByRole('switch', {
            name: 'Select Scroll Model 0799',
            exact: true
        })
    ).toBeChecked()
    await page
        .getByRole('textbox', { name: 'Search configured models' })
        .fill('does-not-exist')
    await expect(page.getByText('No models match your search.')).toBeVisible()
    await page
        .getByRole('textbox', { name: 'Search configured models' })
        .fill('')
    await expect(
        page.getByRole('heading', { name: 'Scroll Model 0000', exact: true })
    ).toBeVisible()
})

test('pointer and keyboard sorting preserve order and stop when leaving reorder mode', async ({
    page
}) => {
    await seed(page, 80)
    await page.getByRole('button', { name: 'Reorder', exact: true }).click()
    const source = page.getByRole('button', {
        name: 'Drag Scroll Model 0000',
        exact: true
    })
    const target = page.locator('[data-model-id="scroll-1"]')
    const from = (await source.boundingBox())!
    const to = (await target.boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
        steps: 10
    })
    await page.mouse.up()
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAppStore } = await import('/src/lib/store.ts')
                return useAppStore
                    .getState()
                    .models.slice(0, 2)
                    .map((model) => model.id)
            })
        )
        .toEqual(['scroll-1', 'scroll-0'])
    const keyboard = page.getByRole('button', {
        name: 'Drag Scroll Model 0001',
        exact: true
    })
    await keyboard.focus()
    await keyboard.press('Space')
    await keyboard.press('ArrowRight')
    await keyboard.press('Space')
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAppStore } = await import('/src/lib/store.ts')
                return useAppStore
                    .getState()
                    .models.slice(0, 2)
                    .map((model) => model.id)
            })
        )
        .toEqual(['scroll-0', 'scroll-1'])
    await page
        .getByRole('button', { name: 'Done reordering', exact: true })
        .click()
    await expect(page.getByRole('button', { name: /^Drag / })).toHaveCount(0)
})

test('drag source survives scrolling out of view and can be dropped far down the catalog', async ({
    page
}) => {
    await seed(page, 600)
    await page.getByRole('button', { name: 'Reorder', exact: true }).click()
    const source = (await page
        .getByRole('button', { name: 'Drag Scroll Model 0000', exact: true })
        .boundingBox())!
    await page.mouse.move(source.x + 5, source.y + 5)
    await page.mouse.down()
    await page.mouse.move(source.x + 20, source.y + 20)
    const viewport = page.getByRole('region', { name: 'Model list' })
    await viewport.evaluate((element) => {
        element.scrollTop = 8000
    })
    await expect
        .poll(() => page.locator('[data-model-id="scroll-144"]').count())
        .toBe(1)
    expect(await page.locator('[data-model-id]').count()).toBeLessThan(70)
    // The jump mounts scroll-144 while the virtualizer is still applying
    // keep-visual-stability corrections: estimated 224px rows measure to
    // 240px, which keeps nudging scrollTop after the card mounts. Center the
    // card and wait until the scroll position and the card's viewport box are
    // stable across animation frames, otherwise the box read below no longer
    // matches the geometry at drop time and the pointer lands a row below the
    // intended target.
    await viewport.evaluate((element) => {
        const card = element.querySelector('[data-model-id="scroll-144"]')
        if (!card) throw new Error('scroll-144 is not mounted')
        element.scrollTop +=
            card.getBoundingClientRect().top -
            element.getBoundingClientRect().top -
            element.clientHeight / 2 +
            card.getBoundingClientRect().height / 2
    })
    await viewport.evaluate(async (element) => {
        const cardSelector = '[data-model-id="scroll-144"]'
        const nextFrame = () => {
            const { promise, resolve } = Promise.withResolvers<void>()
            requestAnimationFrame(resolve)
            return promise
        }
        let lastScrollTop = element.scrollTop
        let lastCardY = element
            .querySelector(cardSelector)
            ?.getBoundingClientRect().y
        for (let frame = 0; frame < 120; frame++) {
            await nextFrame()
            const scrollTop = element.scrollTop
            const cardY = element
                .querySelector(cardSelector)
                ?.getBoundingClientRect().y
            if (scrollTop === lastScrollTop && cardY === lastCardY) return
            lastScrollTop = scrollTop
            lastCardY = cardY
        }
        throw new Error('model list scroll did not settle')
    })
    const destination = (await page
        .locator('[data-model-id="scroll-144"]')
        .boundingBox())!
    await page.mouse.move(
        destination.x + destination.width / 2,
        destination.y + destination.height / 2,
        { steps: 8 }
    )
    await page.mouse.up()
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAppStore } = await import('/src/lib/store.ts')
                return useAppStore
                    .getState()
                    .models.findIndex((model) => model.id === 'scroll-0')
            })
        )
        .toBe(144)
})
