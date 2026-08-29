import { parseTelegramPostUrl, telegramUsernamesMatch } from '@/lib/telegram-post-url'
import { DealActionError } from '@/lib/server/deal-errors'
import { getAdminClient, loadDealForAction } from '@/lib/server/deal-repository'

export type AssociateTelegramProofInput = {
  dealId: string
  postUrl: string
  userId: string
  requireCreator?: boolean
}

export async function associateTelegramProof(input: AssociateTelegramProofInput) {
  const parsed = parseTelegramPostUrl(input.postUrl)
  if (!parsed) {
    throw new DealActionError('Invalid Telegram post URL', 400)
  }

  if (parsed.username.startsWith('c/')) {
    throw new DealActionError('Private channel post URLs are not supported', 400)
  }

  const deal = await loadDealForAction(input.dealId)
  const channel = deal.channels
  if (!channel) {
    throw new DealActionError('Channel not found', 404)
  }

  if (input.requireCreator && channel.owner_id !== input.userId) {
    throw new DealActionError('Forbidden', 403)
  }

  if (channel.platform && channel.platform !== 'telegram') {
    throw new DealActionError('Not a Telegram channel deal', 400)
  }

  if (!telegramUsernamesMatch(channel.telegram_username, parsed.username)) {
    throw new DealActionError('Post does not belong to deal channel', 400)
  }

  const admin = getAdminClient()
  const { data: postId, error: rpcError } = await admin.rpc('associate_telegram_post_deal', {
    p_channel_id: deal.channel_id,
    p_message_id: parsed.messageId,
    p_ad_request_id: input.dealId,
    p_deal_price: deal.final_price ?? deal.budget,
  })

  if (rpcError) {
    if (rpcError.message.includes('not been observed by analytics yet')) {
      throw new DealActionError('Telegram post has not been observed by analytics yet', 400)
    }
    throw new DealActionError('Association failed', 500)
  }

  return {
    postId: postId as string,
    messageId: parsed.messageId,
    username: parsed.username,
  }
}
