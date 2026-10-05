import { expect, test } from '@playwright/test'

test('settings switch the interface immediately and preserve preferences across reloads', async ({
    page
}) => {
    await page.goto('/')
    await page
        .getByRole('link', { name: 'Settings', exact: true })
        .first()
        .click()
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
    await page.getByRole('link', { name: '设置', exact: true }).first().click()
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
    await page.getByRole('link', { name: '設定', exact: true }).first().click()
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
    await page.getByRole('link', { name: 'Models', exact: true }).click()
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(
        page.getByRole('heading', { name: 'Settings', exact: true })
    ).toBeVisible()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
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

test('command palette navigates by keyboard and restores focus on dismissal', async ({
    page
}) => {
    await page.goto('/settings')
    await expect(
        page.getByRole('heading', { name: 'Settings', exact: true })
    ).toBeVisible()
    await page.keyboard.press('Control+k')
    const palette = page.getByRole('dialog', { name: 'Commands', exact: true })
    const search = palette.getByRole('textbox', {
        name: 'Search commands...',
        exact: true
    })
    await expect(search).toBeFocused()
    await search.fill('Prompts')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/prompts$/)
    await expect(palette).not.toBeVisible()

    await page.keyboard.press('Meta+k')
    await expect(search).toBeFocused()
    await search.fill('Models')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/models$/)

    const modelsLink = page.getByRole('link', { name: 'Models', exact: true })
    await modelsLink.focus()
    await page.keyboard.press('Control+k')
    await expect(search).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(palette).not.toBeVisible()
    await expect(modelsLink).toBeFocused()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.keyboard.press('Control+k')
    await expect(search).toBeFocused()
    await page.keyboard.press('ArrowUp')
    const lastCommand = palette.getByRole('option', {
        name: 'Keyboard Shortcuts',
        exact: true
    })
    await expect(lastCommand).toHaveAttribute('aria-selected', 'true')
    await expect(lastCommand).toBeInViewport({ ratio: 1 })
    await page.keyboard.press('ArrowDown')
    const firstCommand = palette.getByRole('option', {
        name: 'Arena',
        exact: true
    })
    await expect(firstCommand).toHaveAttribute('aria-selected', 'true')
    await expect(firstCommand).toBeInViewport({ ratio: 1 })
    await page.keyboard.press('Escape')
    await expect(palette).not.toBeVisible()
})

test('dialog content aligns with its header and stays scrollable in small windows', async ({
    page
}) => {
    for (const width of [1000, 390]) {
        await page.setViewportSize({ width, height: 600 })
        for (const [route, trigger] of [
            ['/models', 'Add'],
            ['/models', 'Add provider'],
            ['/prompts', 'Create'],
            ['/tests', 'Create'],
            ['/experiments', 'New Experiment'],
            ['/', 'Configure'],
            ['/', 'Judge']
        ]) {
            await page.goto(route)
            await page
                .getByRole('button', { name: trigger, exact: true })
                .first()
                .click()
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            const body = dialog.locator('[data-slot="dialog-body"]')
            const header = dialog.locator('[data-slot="dialog-header"]')
            const footer = dialog.locator('[data-slot="dialog-footer"]')
            await expect(header).toBeInViewport({ ratio: 1 })
            await expect(footer).toBeInViewport({ ratio: 1 })
            const geometry = await dialog.evaluate((element) => {
                const body = element.querySelector<HTMLElement>(
                    '[data-slot="dialog-body"]'
                )!
                const header = element.querySelector<HTMLElement>(
                    '[data-slot="dialog-header"]'
                )!
                const footer = element.querySelector<HTMLElement>(
                    '[data-slot="dialog-footer"]'
                )!
                const bodyStyle = getComputedStyle(body)
                const rect = element.getBoundingClientRect()
                return {
                    left: rect.left,
                    right: rect.right,
                    bodyPadding: Number.parseFloat(bodyStyle.paddingLeft),
                    rightPadding: Number.parseFloat(bodyStyle.paddingRight),
                    headerPadding: Number.parseFloat(
                        getComputedStyle(header).paddingLeft
                    ),
                    footerPadding: Number.parseFloat(
                        getComputedStyle(footer).paddingRight
                    ),
                    overflow: body.scrollWidth - body.clientWidth,
                    scrollable: body.scrollHeight > body.clientHeight
                }
            })
            expect(geometry.left).toBeGreaterThanOrEqual(15)
            expect(geometry.right).toBeLessThanOrEqual(width - 15)
            expect(geometry.bodyPadding).toBeGreaterThanOrEqual(16)
            expect(geometry.rightPadding).toBe(geometry.bodyPadding)
            expect(geometry.headerPadding).toBe(geometry.bodyPadding)
            expect(geometry.footerPadding).toBe(geometry.bodyPadding)
            expect(geometry.overflow).toBeLessThanOrEqual(1)
            if (trigger === 'Add' || trigger === 'Create') {
                expect(geometry.scrollable).toBe(true)
                const before = await footer.boundingBox()
                await body.hover()
                await page.mouse.wheel(0, 3000)
                await expect
                    .poll(() => body.evaluate((element) => element.scrollTop))
                    .toBeGreaterThan(0)
                const after = await footer.boundingBox()
                expect(Math.abs(after!.y - before!.y)).toBeLessThan(1)
                await expect(footer).toBeInViewport({ ratio: 1 })
            }
            await page.keyboard.press('Escape')
            await expect(dialog).not.toBeVisible()
        }
    }
})

test('model validation and prompt deletion use in-app alerts without losing edits', async ({
    page
}) => {
    page.on('dialog', () => {
        throw new Error('Unexpected native dialog')
    })
    await page.goto('/models')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'Add New Model' })
    await editor.getByLabel('Display Name', { exact: true }).fill('   ')
    await editor.getByLabel('Model ID', { exact: true }).fill('test-model')
    await editor
        .getByRole('button', { name: 'Save Model', exact: true })
        .click()
    const alert = page.getByRole('alertdialog')
    await expect(alert).toBeVisible()
    await alert.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(alert).not.toBeVisible()
    await expect(editor).toBeVisible()
    await expect(editor.getByLabel('Model ID', { exact: true })).toHaveValue(
        'test-model'
    )
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.locator('#import-models').setInputFiles({
        name: 'invalid-models.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{}')
    })
    await expect(alert).toBeVisible()
    await alert.getByRole('button', { name: 'Close', exact: true }).click()
    await page.goto('/prompts')
    const deleteButtons = page.getByRole('button', {
        name: 'Delete',
        exact: true
    })
    await expect(deleteButtons.first()).toBeVisible()
    const count = await deleteButtons.count()
    await deleteButtons.first().click()
    await expect(alert).toHaveAccessibleName('Delete Template')
    await alert.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(deleteButtons).toHaveCount(count)
    await deleteButtons.first().click()
    await alert.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(alert).not.toBeVisible()
    await expect(deleteButtons).toHaveCount(count - 1)
})
