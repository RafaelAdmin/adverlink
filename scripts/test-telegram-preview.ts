/**
 * Diagnostic script — imports shared production parser/fetch module.
 * Usage: npm run test:telegram-preview -- <channel_username> <message_id>
 */

import {
  buildPreviewUrl,
  extractViewsForPost,
  fetchChannelPreview,
  fetchPostPreviewFallback,
  normalizePublicUsername,
  parseMessageIdArg,
} from '@/lib/telegram-web-preview'

function printAttempt(
  label: string,
  url: string,
  fetchResult: { ok: boolean; status: number; contentType: string | null; htmlLength: number; error: string | null },
  extract: ReturnType<typeof extractViewsForPost>,
): void {
  console.log(`\n=== ${label} ===`)
  console.log(`URL: ${url}`)
  console.log(`HTTP status: ${fetchResult.status || '(no response)'}`)
  console.log(`Content-Type: ${fetchResult.contentType ?? '(none)'}`)
  console.log(`HTML length: ${fetchResult.htmlLength}`)
  if (fetchResult.error) {
    console.log(`Fetch error: ${fetchResult.error}`)
    return
  }
  console.log(`Exact data-post found: ${extract.found ? 'yes' : 'no'}`)
  console.log(`Raw view text: ${extract.rawViewText ?? '(not found)'}`)
  console.log(`Parsed view count: ${extract.parsedViews ?? '(null)'}`)
}

async function main(): Promise<void> {
  const usernameArg = process.argv[2]
  const messageIdArg = process.argv[3]

  if (!usernameArg || !messageIdArg) {
    console.error('Usage: npm run test:telegram-preview -- <channel_username> <message_id>')
    console.error('Example: npm run test:telegram-preview -- durov 123')
    process.exit(1)
  }

  const username = normalizePublicUsername(usernameArg)
  if (!username) {
    console.error('Invalid public Telegram username. Use 5–32 chars: letters, digits, underscore.')
    process.exit(1)
  }

  const messageId = parseMessageIdArg(messageIdArg)
  if (messageId === null) {
    console.error('Invalid message_id. Must be a positive integer.')
    process.exit(1)
  }

  console.log('Telegram preview PoC (diagnostic only)')
  console.log(`Channel: @${username}`)
  console.log(`Message ID: ${messageId}`)

  const mainUrl = buildPreviewUrl(username)
  const mainFetch = await fetchChannelPreview(username)
  const mainExtract = mainFetch.html
    ? extractViewsForPost(mainFetch.html, username, messageId)
    : { found: false, rawViewText: null, parsedViews: null }

  printAttempt('Primary: /s/<username>', mainUrl, mainFetch, mainExtract)

  if (!mainExtract.found || mainExtract.parsedViews === null) {
    const fallbackUrl = buildPreviewUrl(username, messageId)
    const fallbackFetch = await fetchPostPreviewFallback(username, messageId)
    const fallbackExtract = fallbackFetch.html
      ? extractViewsForPost(fallbackFetch.html, username, messageId)
      : { found: false, rawViewText: null, parsedViews: null }

    printAttempt('Fallback: /s/<username>/<message_id>', fallbackUrl, fallbackFetch, fallbackExtract)

    if (!fallbackExtract.found) {
      console.log('\nNote: Post not found on either URL.')
    } else if (fallbackExtract.parsedViews !== null) {
      console.log('\nResult: Fallback URL succeeded.')
    }
  } else {
    console.log('\nResult: Primary URL succeeded.')
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/test-telegram-preview.ts')

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
