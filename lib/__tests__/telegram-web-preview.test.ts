import { describe, expect, it } from 'vitest'
import {
  acceptMonotonicViewUpdate,
  extractViewsForPost,
  isSnapshotRetryExpired,
  normalizePublicUsername,
  parseAbbreviatedViewCount,
  parseChannelPreviewHtml,
  SNAPSHOT_RETRY_GRACE_MS,
} from '../telegram-web-preview'

describe('parseAbbreviatedViewCount', () => {
  it('parses integer and abbreviated formats', () => {
    expect(parseAbbreviatedViewCount('3')).toBe(3)
    expect(parseAbbreviatedViewCount('843')).toBe(843)
    expect(parseAbbreviatedViewCount('1.2K views')).toBe(1200)
    expect(parseAbbreviatedViewCount('25K')).toBe(25000)
    expect(parseAbbreviatedViewCount('1.4M')).toBe(1400000)
    expect(parseAbbreviatedViewCount('2.5k')).toBe(2500)
    expect(parseAbbreviatedViewCount('3m')).toBe(3_000_000)
  })

  it('returns null for invalid or empty input — never 0', () => {
    expect(parseAbbreviatedViewCount('')).toBeNull()
    expect(parseAbbreviatedViewCount('n/a')).toBeNull()
    expect(parseAbbreviatedViewCount('0')).toBeNull()
    expect(parseAbbreviatedViewCount('1.2.3K')).toBeNull()
    expect(parseAbbreviatedViewCount('invalid')).toBeNull()
  })
})

describe('parseChannelPreviewHtml / extractViewsForPost', () => {
  const html = `
    <div data-post="OtherChannel/999" class="tgme_widget_message">
      <span class="tgme_widget_message_views">99K views</span>
    </div>
    <div data-post="AdverLink/10" class="tgme_widget_message">
      <span class="tgme_widget_message_views">3 views</span>
    </div>
    <div data-post="adverlink/11" class="tgme_widget_message">
      <span class="tgme_widget_message_views">1.2K views</span>
    </div>
  `

  it('parses all visible posts into a map', () => {
    const map = parseChannelPreviewHtml(html, 'AdverLink')
    expect(map.get(10)).toBe(3)
    expect(map.get(11)).toBe(1200)
    expect(map.has(999)).toBe(false)
  })

  it('matches username case-insensitively and message id exactly', () => {
    const result = extractViewsForPost(html, 'adverlink', 10)
    expect(result.found).toBe(true)
    expect(result.parsedViews).toBe(3)
  })

  it('ignores wrong username and neighboring posts', () => {
    expect(extractViewsForPost(html, 'AdverLink', 999).found).toBe(false)
    expect(extractViewsForPost(html, 'AdverLink', 11).parsedViews).toBe(1200)
    expect(extractViewsForPost(html, 'AdverLink', 1).found).toBe(false)
  })
})

describe('acceptMonotonicViewUpdate', () => {
  it('accepts null → value and non-decreasing updates', () => {
    expect(acceptMonotonicViewUpdate(null, 100)).toBe(true)
    expect(acceptMonotonicViewUpdate(100, 150)).toBe(true)
    expect(acceptMonotonicViewUpdate(150, 150)).toBe(true)
  })

  it('rejects decreases and non-positive values', () => {
    expect(acceptMonotonicViewUpdate(150, 100)).toBe(false)
    expect(acceptMonotonicViewUpdate(null, 0)).toBe(false)
    expect(acceptMonotonicViewUpdate(10, -5)).toBe(false)
  })
})

describe('isSnapshotRetryExpired', () => {
  it('expires after checkpoint-specific grace', () => {
    const scheduled = new Date('2026-01-01T12:00:00Z')
    const beforeGrace = new Date(scheduled.getTime() + SNAPSHOT_RETRY_GRACE_MS.publication - 1000)
    const afterGrace = new Date(scheduled.getTime() + SNAPSHOT_RETRY_GRACE_MS.publication + 1000)

    expect(isSnapshotRetryExpired('publication', scheduled, beforeGrace)).toBe(false)
    expect(isSnapshotRetryExpired('publication', scheduled, afterGrace)).toBe(true)
  })
})

describe('normalizePublicUsername', () => {
  it('rejects arbitrary URLs', () => {
    expect(normalizePublicUsername('https://t.me/foo')).toBeNull()
    expect(normalizePublicUsername('@AdverLink')).toBe('AdverLink')
  })
})
