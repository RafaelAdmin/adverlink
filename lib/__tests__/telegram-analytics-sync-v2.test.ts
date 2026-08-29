import { describe, expect, it, vi, beforeEach } from 'vitest'
import { aggregatePostViews, computeErr24 } from '../telegram-analytics'
import {
  acceptMonotonicViewUpdate,
  captureSnapshot,
  processDueSnapshots,
} from '../telegram-analytics-sync'
import * as telegramBot from '../telegram-bot'
import * as webPreview from '../telegram-web-preview'

function mockQueryChain(resolver: () => unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then?: (resolve: (value: unknown) => void) => Promise<unknown>
  } = {}
  for (const method of ['eq', 'lte', 'limit', 'in', 'select', 'single', 'order', 'maybeSingle']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.then = (resolve: (value: unknown) => void) => Promise.resolve(resolver()).then(resolve)
  chain.limit.mockImplementation(() => chain)
  chain.in.mockImplementation(() => chain)
  chain.select.mockReturnValue(chain)
  return chain
}

function mockUpdateChain() {
  const chain = { eq: vi.fn() }
  chain.eq.mockReturnValue(chain)
  return { update: vi.fn().mockReturnValue(chain), chain }
}

function createMetricsSupabaseMock() {
  const channelsChain = mockQueryChain(() => ({
    data: {
      id: 'c1',
      subscriber_count: 100,
      analytics_status: 'connected',
      analytics_posts_tracked: 1,
    },
  }))
  channelsChain.select.mockReturnValue(channelsChain)

  const postsCountChain = mockQueryChain(() => ({ count: 1 }))
  postsCountChain.select.mockReturnValue(postsCountChain)

  const postsSelectChain = mockQueryChain(() => ({
    data: [{ id: 'p1', views_at_ingest: null, current_views: 100 }],
  }))
  postsSelectChain.select.mockReturnValue(postsSelectChain)

  const snapsChain = mockQueryChain(() => ({ data: [] }))
  snapsChain.select.mockReturnValue(snapsChain)

  let postsFromCalls = 0

  return {
    from: vi.fn((table: string) => {
      if (table === 'channels') return channelsChain
      if (table === 'telegram_posts') {
        postsFromCalls += 1
        return postsFromCalls === 1 ? postsCountChain : postsSelectChain
      }
      if (table === 'telegram_post_snapshots') return snapsChain
      return mockQueryChain(() => ({ data: null }))
    }),
    rpc: vi.fn().mockResolvedValue(undefined),
  }
}

describe('acceptMonotonicViewUpdate (re-export)', () => {
  it('rejects lowering current_views', () => {
    expect(acceptMonotonicViewUpdate(150, 100)).toBe(false)
  })
})

describe('aggregatePostViews with real 24h snapshots', () => {
  it('makes ERR24 eligible when 24h views exist', () => {
    const aggregated = aggregatePostViews([
      { views: 500, views24h: 400 },
      { views: 600, views24h: 450 },
    ])
    expect(aggregated.eligible24hCount).toBe(2)
    expect(aggregated.avgViews24h).toBe(425)
    expect(computeErr24(1000, aggregated.avgViews24h!)).toBe(42.5)
  })
})

describe('processDueSnapshots batching', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches channel preview once for multiple due snapshots on same channel', async () => {
    const fetchSpy = vi.spyOn(webPreview, 'fetchChannelPreview').mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      htmlLength: 100,
      error: null,
      html: `
        <div data-post="AdverLink/10"><span class="tgme_widget_message_views">3 views</span></div>
        <div data-post="AdverLink/11"><span class="tgme_widget_message_views">5 views</span></div>
      `,
    })
    vi.spyOn(webPreview, 'fetchPostPreviewFallback')
    vi.spyOn(telegramBot, 'getChatMemberCount').mockResolvedValue(100)

    const snapshotUpdates: unknown[] = []
    const postUpdates: unknown[] = []
    const snapshotTable = mockUpdateChain()
    const postTable = mockUpdateChain()
    snapshotTable.update.mockImplementation((payload: unknown) => {
      snapshotUpdates.push(payload)
      return snapshotTable.chain
    })
    postTable.update.mockImplementation((payload: unknown) => {
      postUpdates.push(payload)
      return postTable.chain
    })

    const dueSnapshots = [
      { id: 's1', post_id: 'p1', checkpoint: '1h', scheduled_at: new Date(Date.now() - 60_000).toISOString() },
      { id: 's2', post_id: 'p2', checkpoint: '6h', scheduled_at: new Date(Date.now() - 60_000).toISOString() },
    ]

    const posts = [
      {
        id: 'p1',
        channel_id: 'c1',
        telegram_chat_id: 1,
        telegram_message_id: 10,
        current_views: null,
        channels: { telegram_username: 'AdverLink' },
      },
      {
        id: 'p2',
        channel_id: 'c1',
        telegram_chat_id: 1,
        telegram_message_id: 11,
        current_views: null,
        channels: { telegram_username: 'AdverLink' },
      },
    ]

    const dueChain = mockQueryChain(async () => ({ data: dueSnapshots }))
    const postsChain = mockQueryChain(async () => ({ data: posts }))
    const metricsSupabase = createMetricsSupabaseMock()

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'telegram_post_snapshots') {
          return {
            select: dueChain.select,
            update: snapshotTable.update,
          }
        }
        if (table === 'telegram_posts') {
          return {
            select: postsChain.select,
            update: postTable.update,
          }
        }
        return metricsSupabase.from(table)
      }),
      rpc: metricsSupabase.rpc,
    }

    const result = await processDueSnapshots(supabase as never, 30)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('AdverLink')
    expect(result.previewChannelsFetched).toBe(1)
    expect(result.viewsResolved).toBe(2)
    expect(result.failed).toBe(0)
    expect(snapshotUpdates).toHaveLength(2)
    expect(snapshotUpdates[0]).toMatchObject({ views: 3, views_unavailable: false, status: 'captured' })
    expect(snapshotUpdates[1]).toMatchObject({ views: 5, views_unavailable: false, status: 'captured' })
    expect(postUpdates).toHaveLength(2)
    expect(postUpdates[0]).toMatchObject({ current_views: 3 })
    expect(postUpdates[1]).toMatchObject({ current_views: 5 })
  })

  it('leaves snapshots pending on temporary fetch failure without writing views=0', async () => {
    vi.spyOn(webPreview, 'fetchChannelPreview').mockResolvedValue({
      ok: false,
      status: 0,
      contentType: null,
      htmlLength: 0,
      error: 'Timeout',
      html: '',
    })
    vi.spyOn(telegramBot, 'getChatMemberCount').mockResolvedValue(50)

    const snapshotTable = mockUpdateChain()
    const scheduledAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'telegram_post_snapshots') {
          return {
            select: mockQueryChain(async () => ({
              data: [{ id: 's1', post_id: 'p1', checkpoint: 'publication', scheduled_at: scheduledAt }],
            })).select,
            update: snapshotTable.update,
          }
        }
        if (table === 'telegram_posts') {
          return {
            select: mockQueryChain(async () => ({
              data: [{
                id: 'p1',
                channel_id: 'c1',
                telegram_chat_id: 1,
                telegram_message_id: 10,
                current_views: null,
                channels: { telegram_username: 'AdverLink' },
              }],
            })).select,
          }
        }
        return { select: vi.fn() }
      }),
      rpc: vi.fn(),
    }

    const result = await processDueSnapshots(supabase as never, 30)

    expect(result.leftPending).toBe(1)
    expect(result.viewsUnavailable).toBe(0)
    expect(result.updated).toBe(0)
    expect(snapshotTable.update).not.toHaveBeenCalled()
  })
})

describe('stale retry expiration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('marks views unavailable after grace expires', async () => {
    vi.spyOn(webPreview, 'fetchChannelPreview').mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      htmlLength: 50,
      error: null,
      html: '<div>no posts</div>',
    })
    vi.spyOn(webPreview, 'fetchPostPreviewFallback').mockResolvedValue({
      ok: false,
      status: 404,
      contentType: null,
      htmlLength: 0,
      error: 'HTTP 404',
      html: '',
    })
    vi.spyOn(telegramBot, 'getChatMemberCount').mockResolvedValue(10)

    const snapshotUpdates: unknown[] = []
    const snapshotTable = mockUpdateChain()
    snapshotTable.update.mockImplementation((payload: unknown) => {
      snapshotUpdates.push(payload)
      return snapshotTable.chain
    })

    const scheduledAt = new Date(Date.now() - webPreview.SNAPSHOT_RETRY_GRACE_MS.publication - 60_000).toISOString()
    const metricsSupabase = createMetricsSupabaseMock()

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'telegram_post_snapshots') {
          return {
            select: mockQueryChain(async () => ({
              data: [{ id: 's1', post_id: 'p1', checkpoint: 'publication', scheduled_at: scheduledAt }],
            })).select,
            update: snapshotTable.update,
          }
        }
        if (table === 'telegram_posts') {
          return {
            select: mockQueryChain(async () => ({
              data: [{
                id: 'p1',
                channel_id: 'c1',
                telegram_chat_id: 1,
                telegram_message_id: 99,
                current_views: null,
                channels: { telegram_username: 'AdverLink' },
              }],
            })).select,
            update: mockUpdateChain().update,
          }
        }
        return metricsSupabase.from(table)
      }),
      rpc: metricsSupabase.rpc,
    }

    const result = await processDueSnapshots(supabase as never, 30)

    expect(result.viewsUnavailable).toBe(1)
    expect(result.failed).toBe(0)
    expect(snapshotUpdates).toHaveLength(1)
    expect(snapshotUpdates[0]).toMatchObject({
      views: null,
      views_unavailable: true,
      status: 'captured',
      subscriber_count: 10,
    })
  })
})

describe('captureSnapshot monotonic current_views', () => {
  it('does not include current_views in update when monotonic rejects', async () => {
    const postUpdates: unknown[] = []
    const postTable = mockUpdateChain()
    postTable.update.mockImplementation((payload: unknown) => {
      postUpdates.push(payload)
      return postTable.chain
    })
    const snapshotTable = mockUpdateChain()

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'telegram_post_snapshots') return snapshotTable
        if (table === 'telegram_posts') return postTable
        return mockUpdateChain()
      }),
    }

    await captureSnapshot(supabase as never, 'post-1', '24h', 100, 80, 150)

    expect(postUpdates).toHaveLength(1)
    expect(postUpdates[0]).toMatchObject({
      last_analytics_update: expect.any(String),
    })
    expect(postUpdates[0]).not.toHaveProperty('current_views')
  })

  it('updates current_views when monotonic accepts', async () => {
    const postUpdates: unknown[] = []
    const postTable = mockUpdateChain()
    postTable.update.mockImplementation((payload: unknown) => {
      postUpdates.push(payload)
      return postTable.chain
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'telegram_post_snapshots') return mockUpdateChain()
        if (table === 'telegram_posts') return postTable
        return mockUpdateChain()
      }),
    }

    await captureSnapshot(supabase as never, 'post-1', '24h', 100, 200, 150)

    expect(postUpdates[0]).toMatchObject({ current_views: 200 })
  })
})
