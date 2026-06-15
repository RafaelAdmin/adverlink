# AdverLink

Маркетплейс рекламы в Telegram-каналах для создателей контента и рекламодателей.

## Стек

- Next.js 16 (App Router)
- React 19
- Supabase (auth, database, storage)
- Tailwind CSS 4

## Запуск

```bash
npm install
cp .env.example .env.local   # заполните Supabase URL и anon key
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Переменные окружения

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN` — для API подтягивания данных канала

## Основные маршруты

| Путь | Описание |
|------|----------|
| `/` | Лендинг |
| `/dashboard` | Личный кабинет |
| `/dashboard/marketplace` | Маркетплейс |
| `/about` | О платформе |
| `/faq` | FAQ |

## Supabase

Схема БД настраивается в Supabase SQL Editor. SQL-подсказки для отдельных фич могут встречаться в комментариях исходников; актуальное состояние — в вашем проекте Supabase.
