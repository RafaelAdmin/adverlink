const TELEGRAM_API = 'https://api.telegram.org'

export type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export type TelegramChat = {
  id: number
  type: string
  title?: string
  username?: string
  description?: string
}

export type TelegramChatMember = {
  status: string
  user?: { id: number; is_bot?: boolean; username?: string }
}

export type TelegramMessage = {
  message_id: number
  date: number
  chat: { id: number; type: string; username?: string; title?: string }
  views?: number
  edit_date?: number
}

export type TelegramUpdate = {
  update_id: number
  channel_post?: TelegramMessage
  edited_channel_post?: TelegramMessage
}

let cachedBotId: number | null = null

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  return token
}

export async function callTelegramApi<T>(
  method: string,
  params?: Record<string, string | number | boolean>,
): Promise<TelegramApiResponse<T>> {
  const token = getToken()
  const url = new URL(`${TELEGRAM_API}/bot${token}/${method}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url.toString())
  return response.json()
}

export async function getBotId(): Promise<number> {
  if (cachedBotId) return cachedBotId
  const data = await callTelegramApi<{ id: number }>('getMe')
  if (!data.ok || !data.result?.id) {
    throw new Error('Failed to get bot identity')
  }
  cachedBotId = data.result.id
  return cachedBotId
}

export function getBotUsername(): string {
  return (process.env.TELEGRAM_BOT_USERNAME || 'adverlink_bot').replace('@', '')
}

export async function getChatByUsername(username: string): Promise<TelegramChat | null> {
  const clean = username.replace('@', '').replace(/[^a-zA-Z0-9_]/g, '')
  if (!clean) return null
  const data = await callTelegramApi<TelegramChat>('getChat', { chat_id: `@${clean}` })
  return data.ok ? data.result ?? null : null
}

export async function getChatMemberCount(chatId: number | string): Promise<number | null> {
  const data = await callTelegramApi<number>('getChatMemberCount', { chat_id: chatId })
  return data.ok && typeof data.result === 'number' ? data.result : null
}

export async function isBotChannelAdmin(chatId: number | string): Promise<boolean> {
  const botId = await getBotId()
  const data = await callTelegramApi<TelegramChatMember>('getChatMember', {
    chat_id: chatId,
    user_id: botId,
  })
  if (!data.ok || !data.result) return false
  return data.result.status === 'administrator' || data.result.status === 'creator'
}

export function extractMessageViews(message: TelegramMessage): number | null {
  const views = message.views
  if (typeof views === 'number' && views >= 0) return views
  return null
}

export async function ensureWebhook(webhookUrl: string, secretToken: string): Promise<boolean> {
  const token = getToken()
  const response = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['channel_post', 'edited_channel_post'],
    }),
  })
  const result = await response.json()
  return result.ok === true
}
