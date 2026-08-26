import { test, expect } from '@playwright/test'
import { LANDING_INTERNAL_LINKS, PUBLIC_ROUTE_CHECKS } from './helpers/routes'

test.describe('Public route smoke checks', () => {
  for (const route of PUBLIC_ROUTE_CHECKS) {
    test(`${route.name} (${route.path}) responds without 404/500`, async ({ request }) => {
      const allowRedirect = 'allowRedirect' in route && route.allowRedirect
      const response = await request.get(route.path, {
        maxRedirects: allowRedirect ? 5 : 0,
      })

      const status = response.status()
      expect(status, `${route.path} returned ${status}`).not.toBe(404)
      expect(status, `${route.path} returned ${status}`).toBeLessThan(500)

      if (allowRedirect && status >= 300 && status < 400) {
        const location = response.headers()['location'] || ''
        expect(location).toMatch(/auth\/login/)
      }
    })
  }
})

test.describe('Landing internal links', () => {
  test('important footer/nav links are reachable', async ({ page, request }) => {
    await page.goto('/')

    for (const href of LANDING_INTERNAL_LINKS) {
      const response = await request.get(href, { maxRedirects: 5 })
      const status = response.status()
      expect(status, `Link ${href} returned ${status}`).not.toBe(404)
      expect(status, `Link ${href} returned ${status}`).toBeLessThan(500)
    }
  })
})
