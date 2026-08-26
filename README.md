# AdverLink

Маркетплейс Telegram-рекламы для армянского рынка.
Соединяет владельцев каналов с рекламодателями.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- Vercel (Deployment)

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/RafaelAdmin/adverlink.git
cd adverlink
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase URL, anon key, and Telegram bot token.

### 4. Set up the database

Go to your Supabase project → SQL Editor  
Run the contents of: `supabase/schema.sql`

**Important:** Immediately after `schema.sql`, run `supabase/security-fixes.sql`.  
Without it, the base `profiles_update_own` policy lets users update any column on their own profile — including `is_admin`, `subscription_plan`, and `is_founder`. The trigger in `security-fixes.sql` blocks privilege escalation; without it, anyone could grant themselves admin access.

### 5. Set up storage

In Supabase dashboard → Storage  
Create a bucket named `avatars` and set it as Public  
Then run the storage policy SQL from the bottom of `schema.sql`

### 6. Make yourself admin

In Supabase SQL Editor:

```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'your@email.com');
```

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing & QA

See **[QA.md](./QA.md)** for unit tests, Playwright E2E, CI pipeline, and required environment variables.

```bash
npm test          # Vitest unit tests
npm run typecheck # TypeScript
npm run test:e2e  # Playwright (run `npm run build` first)
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## Features

- Two-sided marketplace (Creators & Advertisers)
- Telegram channel catalog with real stats
- Ad request system
- Campaign creation and management
- Deal tracking (new → replied → completed)
- Reviews and ratings
- Friends system
- Public creator profiles (`/u/username`)
- Admin panel with full moderation
- Color theme customization per role
- Glassmorphism UI design

## Project Structure

```
app/
├── (public pages)
│   ├── page.tsx          - Landing page
│   ├── pricing/          - Subscription plans
│   └── u/[username]/     - Public user profiles
├── auth/
│   └── login/            - Authentication
├── dashboard/            - Main app (protected)
│   ├── layout.tsx        - Sidebar + topbar
│   ├── page.tsx          - Dashboard home
│   ├── marketplace/      - Channel catalog
│   ├── statistics/       - Analytics
│   ├── reviews/          - Reviews
│   ├── friends/          - Friends system
│   ├── subscriptions/    - Plans & billing
│   ├── settings/         - User settings
│   ├── profile/          - Edit profile
│   ├── channel/[id]/     - Channel detail
│   ├── edit-channel/[id]/- Edit channel
│   └── add-channel/      - Add new channel
├── admin/                - Admin panel (protected)
└── api/
    └── telegram/         - Telegram Bot API proxy

supabase/
└── schema.sql            - Complete database schema

middleware.ts             - Route protection
```
