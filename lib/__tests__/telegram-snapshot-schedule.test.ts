import { describe, expect, it } from 'vitest'
import {
  getScheduledSnapshots,
  isSnapshotDue,
  nextDueCheckpoint,
  SNAPSHOT_CHECKPOINTS,
} from '../telegram-snapshot-schedule'

describe('getScheduledSnapshots', () => {
  it('schedules all five checkpoints from publication time', () => {
    const published = new Date('2026-01-01T12:00:00Z')
    const snapshots = getScheduledSnapshots(published)
    expect(snapshots.map((s) => s.checkpoint)).toEqual([...SNAPSHOT_CHECKPOINTS])
    expect(snapshots[0].scheduledAt.getTime()).toBe(published.getTime())
    expect(snapshots[1].scheduledAt.getTime()).toBe(published.getTime() + 3600000)
  })
})

describe('isSnapshotDue', () => {
  it('returns true when scheduled time has passed', () => {
    const scheduled = new Date('2026-01-01T10:00:00Z')
    const now = new Date('2026-01-01T11:00:00Z')
    expect(isSnapshotDue(scheduled, now)).toBe(true)
  })

  it('returns false when scheduled time is far in the future', () => {
    const scheduled = new Date('2026-01-01T20:00:00Z')
    const now = new Date('2026-01-01T10:00:00Z')
    expect(isSnapshotDue(scheduled, now)).toBe(false)
  })
})

describe('nextDueCheckpoint', () => {
  it('returns publication first, then later checkpoints', () => {
    const published = new Date('2026-01-01T12:00:00Z')
    const now = new Date('2026-01-01T12:30:00Z')
    expect(nextDueCheckpoint(published, new Set(), now)).toBe('publication')

    const afterPub = nextDueCheckpoint(published, new Set(['publication']), now)
    expect(afterPub).toBeNull()
  })

  it('returns 1h checkpoint when due', () => {
    const published = new Date('2026-01-01T12:00:00Z')
    const now = new Date('2026-01-01T13:05:00Z')
    expect(nextDueCheckpoint(published, new Set(['publication']), now)).toBe('1h')
  })
})
