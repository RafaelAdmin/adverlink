export const SOCIAL_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  instagram_not_professional:
    'Для автоматической верификации переключите Instagram на Creator или Business',
  already_linked: 'Этот аккаунт уже подтверждён у другого канала.',
  oauth_denied: 'Вход отменён. Статус аккаунта не изменён.',
  oauth_failed: 'Ошибка подключения',
  missing_state: 'Сессия подтверждения не найдена. Начните заново.',
  expired_state: 'Сессия подтверждения истекла. Начните заново.',
  reused_state: 'Ссылка подтверждения уже использована.',
  user_mismatch: 'Сессия входа не совпадает. Войдите в тот же аккаунт AdverLink и попробуйте снова.',
  forbidden: 'Нет доступа к этому каналу.',
  platform_mismatch: 'Платформа канала не совпадает.',
  missing_external_id: 'Соцсеть не вернула идентификатор аккаунта.',
  not_configured: 'OAuth для этой соцсети ещё не настроен.',
  rate_limited: 'Слишком много попыток. Подождите несколько минут.',
}

export function getSocialOauthErrorMessage(reason: string | null | undefined): string {
  if (!reason) return SOCIAL_OAUTH_ERROR_MESSAGES.oauth_failed
  return SOCIAL_OAUTH_ERROR_MESSAGES[reason] || SOCIAL_OAUTH_ERROR_MESSAGES.oauth_failed
}

export function isInstagramProfessionalAccount(accountType: string | null | undefined): boolean {
  const normalized = (accountType || '').toUpperCase()
  return normalized === 'BUSINESS' || normalized === 'MEDIA_CREATOR' || normalized === 'CREATOR'
}
