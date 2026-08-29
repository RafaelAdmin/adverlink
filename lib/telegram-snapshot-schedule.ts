export const SNAPSHOT_CHECKPOINTS = ['publication', '1h', '6h', '24h', '48h'] as const

export type SnapshotCheckpoint = (typeof SNAPSHOT_CHECKPOINTS)[number]

const CHECKPOINT_OFFSET_MS: Record<SnapshotCheckpoint, number> = {
  publication: 0,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
}

export type ScheduledSnapshot = {
  checkpoint: SnapshotCheckpoint
  scheduledAt: Date
}

export function getScheduledSnapshots(publishedAt: Date): ScheduledSnapshot[] {
  const base = publishedAt.getTime()
  return SNAPSHOT_CHECKPOINTS.map((checkpoint) => ({
    checkpoint,
    scheduledAt: new Date(base + CHECKPOINT_OFFSET_MS[checkpoint]),
  }))
}

/** True when a pending snapshot is due (with small grace window). */
export function isSnapshotDue(scheduledAt: Date, now: Date, graceMs = 5 * 60 * 1000): boolean {
  return scheduledAt.getTime() <= now.getTime() + graceMs
}

/** Pick the next checkpoint that should run after `publishedAt` given `now`. */
export function nextDueCheckpoint(
  publishedAt: Date,
  capturedCheckpoints: Set<string>,
  now: Date,
): SnapshotCheckpoint | null {
  for (const checkpoint of SNAPSHOT_CHECKPOINTS) {
    if (capturedCheckpoints.has(checkpoint)) continue
    const scheduled = new Date(publishedAt.getTime() + CHECKPOINT_OFFSET_MS[checkpoint])
    if (isSnapshotDue(scheduled, now)) return checkpoint
  }
  return null
}
