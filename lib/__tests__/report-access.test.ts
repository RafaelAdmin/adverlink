import { describe, expect, it } from 'vitest'
import { canExportDetailedReport } from '../report-access'
import { isProPlan } from '../subscriptions'

describe('detailed report export access', () => {
  it('uses the existing Pro plan helper, not a parallel subscription system', () => {
    expect(canExportDetailedReport('pro', false)).toBe(isProPlan('pro', false))
    expect(canExportDetailedReport('free', true)).toBe(isProPlan('free', true))
  })

  it('allows Pro subscribers and admins', () => {
    expect(canExportDetailedReport('pro', false)).toBe(true)
    expect(canExportDetailedReport('free', true)).toBe(true)
    expect(canExportDetailedReport('pro', true)).toBe(true)
  })

  it('blocks free users without admin', () => {
    expect(canExportDetailedReport('free', false)).toBe(false)
    expect(canExportDetailedReport(null, false)).toBe(false)
    expect(canExportDetailedReport(undefined, undefined)).toBe(false)
  })
})
