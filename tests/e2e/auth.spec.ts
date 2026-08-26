import { test, expect } from '@playwright/test'
import { authSkipReason, hasAuthCredentials, loginAsTestUser } from './helpers/auth'

test.describe('Authenticated flows', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAuthCredentials(), authSkipReason())
    await loginAsTestUser(page)
  })

  test('role switch toggles creator/advertiser labels', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Рекламодатель').first()).toBeVisible()
    await expect(page.getByText('Создатель').first()).toBeVisible()

    const advertiserLabel = page.locator('.topbar-role-label', { hasText: 'Рекламодатель' })
    const creatorLabel = page.locator('.topbar-role-label', { hasText: 'Создатель' })

    const advertiserWeight = await advertiserLabel.evaluate((el) => getComputedStyle(el).fontWeight)
    expect(Number(advertiserWeight)).toBeGreaterThanOrEqual(600)

    const roleToggle = page
      .locator('div')
      .filter({ has: page.getByText('Рекламодатель', { exact: true }) })
      .filter({ has: page.getByText('Создатель', { exact: true }) })
      .locator('button')
      .first()

    await roleToggle.click()

    const creatorWeight = await creatorLabel.evaluate((el) => getComputedStyle(el).fontWeight)
    expect(Number(creatorWeight)).toBeGreaterThanOrEqual(600)
  })

  test('marketplace filters interact without crashing', async ({ page }) => {
    await page.goto('/dashboard/marketplace')
    await page.waitForLoadState('networkidle')

    const filtersButton = page.getByRole('button', { name: /Фильтры/i }).first()
    if (await filtersButton.isVisible()) {
      await filtersButton.click()
      await page.getByText(/Подписчики|Страна|Платформа/i).first().waitFor({ state: 'visible' }).catch(() => {})
    }

    const search = page.locator('input[placeholder*="Поиск"], input[type="search"]').first()
    if (await search.isVisible()) {
      await search.fill('test')
      await search.fill('')
    }

    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/dashboard/marketplace')
  })

  test('admin route rejects non-admin user', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 })

    if (process.env.E2E_TEST_IS_ADMIN === 'true') {
      test.skip(true, 'Skipped: E2E_TEST_IS_ADMIN=true — use a non-admin test account for this check.')
    }

    expect(page.url()).toContain('/dashboard')
    expect(page.url()).not.toContain('/admin')
  })
})
