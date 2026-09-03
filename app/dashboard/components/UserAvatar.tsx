'use client'

import { getAvatarFrameCssColor } from '@/lib/avatar-frame'

type UserAvatarProps = {
  src?: string | null
  name?: string | null
  size: number
  frameColor?: string | null
  className?: string
  borderWidth?: number
}

export default function UserAvatar({
  src,
  name,
  size,
  frameColor,
  className = '',
  borderWidth = 3,
}: UserAvatarProps) {
  const letter = (name || 'U')[0]?.toUpperCase() || 'U'
  const frameCss = getAvatarFrameCssColor(frameColor)
  const ringColor = frameCss || 'var(--user-avatar-border, rgba(255, 255, 255, 0.15))'

  return (
    <div
      className={`user-avatar ${className}`.trim()}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        border: `${borderWidth}px solid ${ringColor}`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="user-avatar__media"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.parentElement?.querySelector(
              '.user-avatar__fallback',
            ) as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
      ) : null}
      <div
        className="avatar-accent-fallback user-avatar__fallback"
        style={{
          fontSize: Math.round(size * 0.38),
          display: src ? 'none' : 'flex',
        }}
      >
        {letter}
      </div>
    </div>
  )
}
