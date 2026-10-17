import { MIN_PASSWORD_LENGTH } from '@/lib/auth-urls'

export function mapAuthErrorMessage(raw: string | null | undefined): string {
  const message = (raw || '').trim()
  const lower = message.toLowerCase()

  if (!message) return 'Не удалось выполнить запрос. Попробуйте ещё раз.'

  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Этот email уже зарегистрирован. Войдите или восстановите пароль.'
  }

  if (lower.includes('email not confirmed')) {
    return 'Email ещё не подтверждён. Проверьте почту или отправьте письмо ещё раз.'
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Неверный email или пароль'
  }

  if (
    lower.includes('password should be') ||
    lower.includes('password is known to be weak') ||
    lower.includes('weak_password') ||
    lower.includes('signup requires a valid password')
  ) {
    return `Пароль слишком слабый. Используйте не менее ${MIN_PASSWORD_LENGTH} символов.`
  }

  if (
    lower.includes('unable to validate email') ||
    lower.includes('invalid email') ||
    (lower.includes('email address') && lower.includes('invalid'))
  ) {
    return 'Укажите корректный email-адрес'
  }

  if (
    lower.includes('error sending') ||
    lower.includes('error sending confirmation email') ||
    lower.includes('error sending recovery email') ||
    lower.includes('smtp') ||
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Не удалось отправить письмо. Подождите минуту и попробуйте снова.'
  }

  if (lower.includes('for security purposes') || lower.includes('you can only request this after')) {
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  }

  if (
    lower.includes('expired') ||
    lower.includes('invalid login') && lower.includes('token') ||
    lower.includes('otp_expired') ||
    lower.includes('access_denied') ||
    lower.includes('invalid or expired')
  ) {
    return 'Ссылка недействительна или истекла. Запросите новое письмо.'
  }

  if (lower.includes('auth session missing') || lower.includes('not authenticated')) {
    return 'Сессия не найдена. Откройте свежую ссылку из письма.'
  }

  return message
}

export function describeSignUpIdentityConflict(identitiesLength: number | undefined | null): boolean {
  return identitiesLength === 0
}
