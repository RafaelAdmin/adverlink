import type { CSSProperties, ReactNode } from 'react'

type SurfaceProps = {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  style?: CSSProperties
  as?: 'div' | 'section' | 'article'
}

const paddingClass = {
  none: '',
  sm: 'ui-surface--pad-sm',
  md: 'ui-surface--pad-md',
  lg: 'ui-surface--pad-lg',
}

export default function Surface({
  children,
  className = '',
  padding = 'md',
  hover = false,
  style,
  as: Tag = 'div',
}: SurfaceProps) {
  return (
    <Tag
      className={`ui-surface ${paddingClass[padding]} ${hover ? 'ui-surface--hover' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  )
}

export function surfaceStyle(padding = '20px'): CSSProperties {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    backdropFilter: 'blur(var(--glass-blur, 12px))',
    WebkitBackdropFilter: 'blur(var(--glass-blur, 12px))',
    padding,
  }
}
