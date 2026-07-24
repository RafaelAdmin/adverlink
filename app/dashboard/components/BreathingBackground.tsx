'use client'

import type { ReactNode } from 'react'

type BreathingBackgroundProps = {
  gradient: string
  children: ReactNode
  className?: string
  lockViewport?: boolean
}

export default function BreathingBackground({
  gradient,
  children,
  className = '',
  lockViewport = false,
}: BreathingBackgroundProps) {
  return (
    <div
      className={`breathing-bg transition-all duration-500 ${lockViewport ? 'h-screen overflow-hidden' : 'min-h-screen'}`}
      style={{ background: gradient }}
    >
      <div className="breathing-bg__shimmer" aria-hidden="true" />
      <div className="breathing-bg__orb breathing-bg__orb--1" aria-hidden="true" />
      <div className="breathing-bg__orb breathing-bg__orb--2" aria-hidden="true" />
      <div className="breathing-bg__orb breathing-bg__orb--3" aria-hidden="true" />
      <div className="breathing-bg__orb breathing-bg__orb--4" aria-hidden="true" />
      <div className={`breathing-bg__content ${lockViewport ? 'h-full' : ''} ${className}`.trim()}>
        {children}
      </div>
    </div>
  )
}
