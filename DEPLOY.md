# Deployment Checklist

## Pre-deployment

- [ ] All environment variables set in hosting platform
- [ ] Supabase schema.sql executed on production database
- [ ] **supabase/security-fixes.sql executed immediately after schema.sql** (required — without it users can set `is_admin` / `subscription_plan` on their own profile)
- [ ] Storage bucket "avatars" created and set to public
- [ ] Admin account created and is_admin set to true
- [ ] Telegram bot token added to environment variables
- [ ] Email confirmation disabled in Supabase Auth settings (optional)

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TELEGRAM_BOT_TOKEN=
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables
6. Deploy

### Option 3: Railway

1. Connect GitHub repo
2. Add environment variables
3. Railway auto-detects Next.js

## TikTok and Instagram OAuth verification

Apply `supabase/social-oauth-verification.sql` in the Supabase SQL Editor.

Add these Vercel environment variables (values only, no quotes):

```
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://www.adverlink.am/api/social-verification/tiktok/callback
META_APP_ID=
META_APP_SECRET=
INSTAGRAM_REDIRECT_URI=https://www.adverlink.am/api/social-verification/instagram/callback
```

Redirect URIs to register:

- TikTok Developers (Login Kit for Web): `https://www.adverlink.am/api/social-verification/tiktok/callback`
- Meta for Developers (Instagram API with Instagram Login): `https://www.adverlink.am/api/social-verification/instagram/callback`

Production notes:

- TikTok and Meta require app review/approval before unverified users can complete Login Kit / Instagram Login in production.
- Meta also requires a Privacy Policy URL and a Data Deletion URL. Use `https://www.adverlink.am/legal/privacy` and `https://www.adverlink.am/legal/data-deletion`.
- Until review is approved, test only with TikTok sandbox / target users and Meta test users / roles on the app.

- [ ] `supabase/social-oauth-verification.sql` executed
- [ ] TikTok and Meta OAuth env vars set in Vercel
- [ ] Redirect URIs registered exactly (https, www, no trailing slash mismatch)

## Channel price list

- [ ] Apply `supabase/channel-prices.sql` in Supabase SQL Editor. This extends the existing `channel_prices` table (`currency`, `sort_order`, RLS). Do not create a second prices table.

## Telegram analytics bot

- [ ] Apply `supabase/telegram-analytics.sql` in Supabase SQL Editor
- [ ] Set env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `TELEGRAM_WEBHOOK_URL=https://www.adverlink.am/api/telegram/webhook` (canonical URL, no redirect)
- [ ] After deploy: reconnect analytics, make the bot a channel admin, verify with a test post

## Post-deployment checks

- [ ] Landing page loads
- [ ] Login/signup works
- [ ] Dashboard redirects work (middleware)
- [ ] Channel can be added with Telegram auto-fill
- [ ] Avatar uploads work
- [ ] Admin panel accessible only for admins
