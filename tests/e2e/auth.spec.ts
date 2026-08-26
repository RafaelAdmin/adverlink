import { test, expect } from '@playwright/test'
import { authSkipReason, hasAuthCredentials, loginAsTestUser } from './helpers/auth'

test.describe('Authenticated flows', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAuthCredentials(), authSkipReason())
    await loginAsTestUser(page)
  })

  test('role switch toggles creator/advertiser labels', async ({ page }) => {
    await page.goto('/dashboard')

    const roleSwitch = page.getByTestId('role-switch')
    const roleToggle = page.getByTestId('role-switch-toggle')

    await expect(roleSwitch).toBeVisible()
    await expect(roleSwitch).toHaveAttribute('data-active-role', 'advertiser')
    await expect(roleToggle).toHaveAttribute('aria-pressed', 'false')

    await roleToggle.click()

    await expect(roleSwitch).toHaveAttribute('data-active-role', 'creator')
    await expect(roleToggle).toHaveAttribute('aria-pressed', 'true')

    await roleToggle.click()

    await expect(roleSwitch).toHaveAttribute('data-active-role', 'advertiser')
    await expect(roleToggle).toHaveAttribute('aria-pressed', 'false')
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
