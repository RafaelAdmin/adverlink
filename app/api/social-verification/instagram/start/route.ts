import { NextRequest } from 'next/server'
import { startSocialOauth } from '@/lib/server/social-oauth-flow'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return startSocialOauth(request, 'instagram')
}
