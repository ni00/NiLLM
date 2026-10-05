import { expect, test, type Page } from '@playwright/test'

async function openProviderSelect(page: Page, action: 'Add provider' | 'Add') {
    await page.goto('/models')
    await page.getByRole('button', { name: action, exact: true }).click()
    const dialog = page
        .locator('[role="dialog"]')
        .filter({ has: page.locator('[role="combobox"]') })
    const trigger = dialog.getByRole('combobox', {
        name: 'Provider',
        exact: true
    })
    await trigger.click()
    return {
        dialog,
        trigger,
        popup: page.locator('[data-slot="popover-content"]')
    }
}

for (const action of ['Add provider', 'Add'] as const) {
    test(`${action}: provider dropdown scrolls with the wheel inside its dialog`, async ({
        page
    }) => {
        await page.setViewportSize({ width: 1000, height: 650 })
        const { dialog, trigger, popup } = await openProviderSelect(
            page,
            action
        )
        await expect
            .poll(() =>
                popup.evaluate((node) => {
                    const bounds = node.getBoundingClientRect()
                    return (
                        bounds.top >= 0 && bounds.bottom <= window.innerHeight
                    )
                })
            )
            .toBe(true)
        const box = (await popup.boundingBox())!
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(650)
        const dialogScroll = await dialog.evaluate((node) => node.scrollTop)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30)
        await page.mouse.wheel(0, 1800)
        await expect
            .poll(() =>
                popup.evaluate((node) =>
                    Math.max(
                        0,
                        ...Array.from(
                            node.querySelectorAll<HTMLElement>('*')
                        ).map((child) => child.scrollTop)
                    )
                )
            )
            .toBeGreaterThan(0)
        await expect(
            popup.getByRole('button', {
                name: 'Custom (OpenAI Compatible)',
                exact: true
            })
        ).toBeInViewport()
        await expect(
            popup.getByRole('textbox', { name: 'Search options' })
        ).toBeInViewport()
        expect(await dialog.evaluate((node) => node.scrollTop)).toBe(
            dialogScroll
        )
        await popup
            .getByRole('button', {
                name: 'Custom (OpenAI Compatible)',
                exact: true
            })
            .click()
        await expect(popup).toHaveCount(0)
        await expect(trigger).toHaveText(/Custom/)
        await expect(trigger).toBeFocused()

        await trigger.click()
        await popup
            .getByRole('textbox', { name: 'Search options' })
            .fill('moonshot')
        await expect(popup.getByRole('button')).toHaveCount(2)
        await popup
            .getByRole('textbox', { name: 'Search options' })
            .press('Escape')
        await expect(popup).toHaveCount(0)
        await expect(trigger).toBeFocused()
        await expect(page.getByRole('dialog')).toBeVisible()
        await trigger.click()
        await expect(
            popup.getByRole('textbox', { name: 'Search options' })
        ).toHaveValue('')
    })
}

test.describe('touch input', () => {
    test.use({ hasTouch: true })
    test('provider list scrolls by touch on a short mobile viewport', async ({
        page,
        context
    }, testInfo) => {
        await page.setViewportSize({ width: 420, height: 700 })
        const { popup } = await openProviderSelect(page, 'Add provider')
        const box = (await popup.boundingBox())!
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(700)
        const cdp = await context.newCDPSession(page)
        const x = box.x + box.width / 2,
            bottom = box.y + box.height - 20
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y: bottom }]
        })
        for (let step = 1; step <= 8; step++) {
            await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: bottom - step * 20 }]
            })
        }
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchEnd',
            touchPoints: []
        })
        await expect
            .poll(() =>
                popup.evaluate((node) =>
                    Math.max(
                        0,
                        ...Array.from(
                            node.querySelectorAll<HTMLElement>('*')
                        ).map((child) => child.scrollTop)
                    )
                )
            )
            .toBeGreaterThan(0)
        await expect(
            popup.getByRole('textbox', { name: 'Search options' })
        ).toBeInViewport()
        await page.screenshot({
            path: testInfo.outputPath('provider-touch-scroll.png')
        })
    })
})
