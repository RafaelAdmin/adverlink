export function validateCronRequest(
  authHeader: string | null,
  cronSecret: string | undefined,
): { ok: true } | { ok: false; status: 503 | 401; error: string } {
  if (!cronSecret) {
    return {
      ok: false,
      status: 503,
      error: 'Cron endpoint is not configured',
    }
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
    }
  }

  return { ok: true }
}
