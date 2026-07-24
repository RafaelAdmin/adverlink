import { getPlatformColor, getPlatformIcon, getPlatformLabel } from '@/lib/channel-helpers'

export default function PlatformBadge({ platform }: { platform?: string | null }) {
  const p = platform || 'telegram'
  const color = getPlatformColor(p)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        background: `${color}22`,
        border: `1px solid ${color}44`,
        borderRadius: '20px',
        padding: '2px 8px',
        fontSize: '10px',
        fontWeight: '600',
        color: 'white',
        flexShrink: 0,
      }}
    >
      <i
        className={`ti ${getPlatformIcon(p)}`}
        style={{ fontSize: '11px', color }}
      />
      {getPlatformLabel(p)}
    </span>
  )
}
