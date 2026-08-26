import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('landing page loads', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(500)

    await expect(page.getByRole('link', { name: /AdverLink/i }).first()).toBeVisible()
    await expect(page.locator('#pricing, .landing-pricing-grid').first()).toBeVisible()
  })

  test('public marketplace entry loads without server error', async ({ page, request }) => {
    const response = await request.get('/marketplace')
    expect(response.status()).not.toBe(404)
    expect(response.status()).toBeLessThan(500)

    await page.goto('/marketplace')
    await expect(page.locator('body')).toBeVisible()

    // Client redirect may lag; unauthenticated access to dashboard marketplace must redirect to login.
    await page.goto('/dashboard/marketplace')
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('login page loads', async ({ page }) => {
    const response = await page.goto('/auth/login')
    expect(response?.status()).toBeLessThan(500)

    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  })

  test('login alias /login redirects to auth login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 })
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('protected dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('invalid route shows 404 page', async ({ page }) => {
    const response = await page.goto('/qa-route-that-does-not-exist-adverlink')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Страница не найдена')).toBeVisible()
    await expect(page.getByRole('link', { name: 'На главную' })).toBeVisible()
  })
})
