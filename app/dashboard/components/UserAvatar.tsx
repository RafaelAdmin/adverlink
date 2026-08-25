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
  const innerSize = size - borderWidth * 2

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        padding: frameCss ? borderWidth : 0,
        background: frameCss || 'transparent',
        boxSizing: 'border-box',
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="rounded-full object-cover"
          style={{
            width: frameCss ? innerSize : size,
            height: frameCss ? innerSize : size,
            border: frameCss ? 'none' : `${borderWidth}px solid rgba(255,255,255,0.15)`,
            boxSizing: 'border-box',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
      ) : null}
      <div
        className="avatar-accent-fallback rounded-full items-center justify-center text-white font-bold"
        style={{
          width: frameCss ? innerSize : size,
          height: frameCss ? innerSize : size,
          fontSize: Math.round(size * 0.38),
          display: src ? 'none' : 'flex',
          border: frameCss ? 'none' : `${borderWidth}px solid rgba(255,255,255,0.15)`,
          boxSizing: 'border-box',
        }}
      >
        {letter}
      </div>
    </div>
  )
}
