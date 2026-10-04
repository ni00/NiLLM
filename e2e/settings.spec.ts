import { expect, test } from '@playwright/test'

test('settings switch the interface immediately and preserve preferences across reloads', async ({
    page
}) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await page.getByRole('combobox', { name: 'Interface language' }).click()
    await page.getByRole('button', { name: '简体中文', exact: true }).click()
    await expect(
        page.getByRole('heading', { name: '设置', exact: true })
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await page.getByRole('combobox', { name: '主题', exact: true }).click()
    await page.getByRole('button', { name: '深色', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('combobox', { name: '并发模型数' }).click()
    await page.getByRole('button', { name: '8', exact: true }).click()
    await page.getByRole('combobox', { name: '内置测试语言' }).click()
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await page.getByRole('link', { name: '测试', exact: true }).click()
    await expect(
        page.getByRole('heading', { name: '测试集', exact: true })
    ).toBeVisible()
    await expect(
        page.getByRole('button', { name: '🇺🇸 English', exact: true })
    ).toBeVisible()
    for (const [label, title] of [
        ['竞技场', '竞技场'],
        ['提示词', '提示词模板'],
        ['模型', '模型'],
        ['统计', '性能统计']
    ]) {
        await page.getByRole('link', { name: label, exact: true }).click()
        await expect(
            page.getByRole('heading', { name: title, exact: true })
        ).toBeVisible()
        await expect(page.locator('main header p')).toHaveCount(0)
    }
    await page.getByRole('link', { name: '模型', exact: true }).click()
    await page.getByRole('button', { name: '添加供应商', exact: true }).click()
    await expect(
        page
            .getByRole('dialog')
            .getByRole('heading', { name: '添加供应商模型' })
    ).toBeVisible()
    await page
        .getByRole('dialog')
        .getByRole('button', { name: '取消', exact: true })
        .click()
    await page.getByRole('link', { name: '设置', exact: true }).click()
    await page.waitForTimeout(300)
    await page.reload()
    await expect(
        page.getByRole('heading', { name: '设置', exact: true })
    ).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('combobox', { name: '并发模型数' })).toHaveText(
        '8'
    )
    await expect(
        page.getByRole('combobox', { name: '内置测试语言' })
    ).toHaveText('English')
    await page.screenshot({ path: 'test-results/settings-zh-dark.png' })
    await page.getByRole('combobox', { name: '界面语言' }).click()
    await page.getByRole('button', { name: '日本語', exact: true }).click()
    await expect(
        page.getByRole('heading', { name: '設定', exact: true })
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
    await page.getByRole('link', { name: 'モデル', exact: true }).click()
    await expect(
        page.getByRole('button', { name: 'プロバイダーを追加', exact: true })
    ).toBeVisible()
    await page.getByRole('link', { name: '設定', exact: true }).click()
    await page.getByRole('combobox', { name: '表示言語' }).click()
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await expect(
        page.getByRole('heading', { name: 'Settings', exact: true })
    ).toBeVisible()
})

test('mobile settings fit the viewport and system theme follows changes', async ({
    page
}) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/settings')
    await expect(
        page.getByRole('heading', { name: 'Settings', exact: true })
    ).toBeVisible()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(390)
    await expect(
        page.getByRole('link', { name: 'Settings', exact: true })
    ).toBeVisible()
    await page.screenshot({ path: 'test-results/settings-mobile.png' })
})

test('settings use the available width and adapt card columns to the window', async ({
    page
}) => {
    await page.goto('/settings')
    const cards = page.locator('main section')
    await expect(cards).toHaveCount(3)
    for (const [width, columns] of [
        [390, 1],
        [1280, 2],
        [2560, 3]
    ]) {
        await page.setViewportSize({ width, height: 1000 })
        await expect
            .poll(async () =>
                cards.first().evaluate((card) => {
                    const grid = card.parentElement!
                    return getComputedStyle(grid).gridTemplateColumns.split(' ')
                        .length
                })
            )
            .toBe(columns)
        const dimensions = await cards.first().evaluate((card) => {
            const grid = card.parentElement!
            const gridRect = grid.getBoundingClientRect()
            const viewport = grid.closest('[data-slot="scroll-area-viewport"]')!
            const viewportRect = viewport.getBoundingClientRect()
            const panels = Array.from(grid.querySelectorAll('section')).map(
                (panel) => panel.getBoundingClientRect()
            )
            const style = getComputedStyle(grid)
            const gap = Number.parseFloat(style.columnGap)
            const columnCount = style.gridTemplateColumns.split(' ').length
            return {
                unusedWidth: viewportRect.width - gridRect.width,
                cardWidth: panels[0].width,
                expectedWidth:
                    (gridRect.width - gap * (columnCount - 1)) / columnCount,
                rightEdge: Math.max(...panels.map((panel) => panel.right)),
                gridRight: gridRect.right
            }
        })
        expect(dimensions.unusedWidth).toBeLessThanOrEqual(48)
        expect(
            Math.abs(dimensions.cardWidth - dimensions.expectedWidth)
        ).toBeLessThan(1)
        expect(
            Math.abs(dimensions.rightEdge - dimensions.gridRight)
        ).toBeLessThan(1)
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth)
        ).toBeLessThanOrEqual(width)
        const footer = await page.locator('main footer').evaluate((element) => {
            const rect = element.getBoundingClientRect()
            const main = element.closest('main')!
            const mainRect = main.getBoundingClientRect()
            const paddingBottom = Number.parseFloat(
                getComputedStyle(main).paddingBottom
            )
            return {
                center: rect.left + rect.width / 2,
                expectedCenter: mainRect.left + mainRect.width / 2,
                bottom: rect.bottom,
                expectedBottom: mainRect.bottom - paddingBottom,
                textAlign: getComputedStyle(element.querySelector('p')!)
                    .textAlign
            }
        })
        expect(Math.abs(footer.center - footer.expectedCenter)).toBeLessThan(1)
        expect(Math.abs(footer.bottom - footer.expectedBottom)).toBeLessThan(1)
        expect(footer.textAlign).toBe('center')
    }
    await page.screenshot({ path: 'test-results/settings-wide.png' })
    await page.setViewportSize({ width: 390, height: 480 })
    const viewport = page.locator('main [data-slot="scroll-area-viewport"]')
    expect(
        await viewport.evaluate(
            (element) => element.scrollHeight > element.clientHeight
        )
    ).toBe(true)
    await page
        .getByRole('combobox', { name: 'Concurrent models' })
        .scrollIntoViewIfNeeded()
    await expect(
        page.getByRole('combobox', { name: 'Concurrent models' })
    ).toBeVisible()
    await expect(page.locator('main footer')).toBeInViewport()
})
