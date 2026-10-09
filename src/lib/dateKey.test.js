import { describe, it, expect, vi, afterEach } from 'vitest'
import { localDateString, todayString } from './dateKey'

afterEach(() => {
  vi.useRealTimers()
})

describe('localDateString', () => {
  it('formats the local calendar day, zero-padded', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('uses the local day just after local midnight, regardless of the UTC offset', () => {
    // Local 00:30 — in any zone ahead of UTC the UTC date is still the
    // previous day, which is exactly the case toISOString().slice(0,10) got wrong.
    expect(localDateString(new Date(2026, 5, 10, 0, 30))).toBe('2026-06-10')
  })

  it('uses the local day late in the evening, regardless of the UTC offset', () => {
    expect(localDateString(new Date(2026, 5, 10, 23, 30))).toBe('2026-06-10')
  })
})

describe('todayString', () => {
  it('follows the (fake) system clock in local time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 0, 15))
    expect(todayString()).toBe('2026-12-31')
  })
})
