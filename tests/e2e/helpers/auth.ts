import type { Page } from '@playwright/test'

export function hasAuthCredentials(): boolean {
  return Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)
}

export function authSkipReason(): string {
  return 'Skipped: set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated E2E tests.'
}

/** Log in via the email/password form on /auth/login. */
export async function loginAsTestUser(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required')
  }

  await page.goto('/auth/login')
  await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}
