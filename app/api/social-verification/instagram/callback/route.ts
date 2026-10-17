import { NextRequest } from 'next/server'
import { handleSocialOauthCallback } from '@/lib/server/social-oauth-flow'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleSocialOauthCallback(request, 'instagram')
}
