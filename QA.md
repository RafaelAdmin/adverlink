# AdverLink — QA & Automated Testing

Minimal automated QA pipeline: unit tests (Vitest), typecheck, production build, and Playwright E2E smoke tests.

## Quick commands

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# TypeScript
npm run typecheck

# Production build
npm run build

# E2E (starts production server — run `npm run build` first)
npm run test:e2e

# E2E with Playwright UI
npm run test:e2e:ui
```

## Playwright layout

```
tests/e2e/
├── public.spec.ts      # Landing, login, redirects, 404
├── navigation.spec.ts  # Public route + link smoke checks
├── security.spec.ts    # P0 API security regressions
├── auth.spec.ts        # Authenticated flows (optional credentials)
└── helpers/
    ├── auth.ts
    └── routes.ts
```

### What is covered

| Suite | Coverage |
|-------|----------|
| `public.spec.ts` | Landing, `/marketplace`, login, dashboard auth redirect, 404 |
| `navigation.spec.ts` | Public routes `/`, `/login`, `/faq`, legal pages, etc. |
| `security.spec.ts` | `/api/subscribe`, `/api/telegram/verify`, `/api/auto-complete` |
| `auth.spec.ts` | Role switch, marketplace filters, admin rejection *(needs credentials)* |

## Environment variables

### Required for CI build & middleware

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `CRON_SECRET` | Enables auto-complete 401 test (without it → 503 expected) |

### Optional — authenticated E2E

| Variable | Purpose |
|----------|---------|
| `E2E_TEST_EMAIL` | Test user email |
| `E2E_TEST_PASSWORD` | Test user password |
| `E2E_TEST_IS_ADMIN` | Set to `true` if test user is admin (skips admin-rejection test) |

If `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are missing, authenticated tests are **skipped** (not failed).

### Local E2E overrides

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | Default `http://127.0.0.1:3000` |
| `PLAYWRIGHT_SKIP_WEBSERVER` | Set to `1` to reuse an already running server |

Copy `.env.example` to `.env.local` and fill values before running E2E locally.

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

On every `push` and `pull_request` to `main` / `master`:

1. `npm ci`
2. `npm test`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:e2e` (Playwright against `npm run start`)

Lint is **not** gated yet (existing lint debt).

### GitHub repository secrets

Configure in **Settings → Secrets and variables → Actions**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CRON_SECRET` *(recommended)*
- `E2E_TEST_EMAIL` *(optional)*
- `E2E_TEST_PASSWORD` *(optional)*
- `TELEGRAM_BOT_TOKEN` *(optional; placeholder used if absent)*

## Adding future E2E tests

1. Add a spec under `tests/e2e/`.
2. Prefer public/API tests without credentials when possible.
3. For dashboard flows, use `helpers/auth.ts` and guard with `hasAuthCredentials()`.
4. Keep tests focused — one behavior per test, no large UI snapshots.
5. Run locally: `npm run build && npm run test:e2e`.

## Notes

- E2E runs against a **local** server started by Playwright — not production.
- Do not commit real credentials; use GitHub Secrets in CI.
- Playwright artifacts (`playwright-report/`, `test-results/`) are gitignored.
