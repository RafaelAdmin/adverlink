# Deployment Checklist

## Pre-deployment

- [ ] All environment variables set in hosting platform
- [ ] Supabase schema.sql executed on production database
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

## Post-deployment checks

- [ ] Landing page loads
- [ ] Login/signup works
- [ ] Dashboard redirects work (middleware)
- [ ] Channel can be added with Telegram auto-fill
- [ ] Avatar uploads work
- [ ] Admin panel accessible only for admins
