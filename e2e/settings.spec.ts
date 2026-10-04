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
