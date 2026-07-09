import { describe, it, expect } from 'vitest'
import {
  effectiveDiff,
  estimationBreakdown,
  avgAbsDiff,
  avgInterruptionsPerTask,
  trendDirection,
  countTicksInDates,
  recordsInDates,
  recordsWithEffectiveDiff,
  takeLast,
  datesForThisWeek,
  datesForLastWeek,
  datesForYesterday,
  datesForPeriod,
  hasNoHistoryYet,
  todayString,
} from './reportsMath'

describe('effectiveDiff', () => {
  it('prefers diffII, then diffI, then diff', () => {
    expect(effectiveDiff({ diff: 1, diffI: 2, diffII: 3 })).toBe(3)
    expect(effectiveDiff({ diff: 1, diffI: 2, diffII: null })).toBe(2)
    expect(effectiveDiff({ diff: 1, diffI: null, diffII: null })).toBe(1)
    expect(effectiveDiff({ diff: null, diffI: null, diffII: null })).toBeNull()
  })
})

describe('estimationBreakdown', () => {
  it('counts underestimated (diff > 0) and overestimated (diff < 0), ignoring perfect and null', () => {
    const records = [
      { diff: 2 }, // underestimated
      { diff: -1 }, // overestimated
      { diff: 0 }, // perfect, not counted either way
      { diff: null }, // never estimated
      { diff: 3 }, // underestimated
    ]
    expect(estimationBreakdown(records)).toEqual({ overestimated: 1, underestimated: 2 })
  })

  it('uses effectiveDiff, so a re-estimated task counts against its latest commitment', () => {
    const records = [{ diff: 5, diffI: -1 }] // original diff says underestimated, diffI says overestimated
    expect(estimationBreakdown(records)).toEqual({ overestimated: 1, underestimated: 0 })
  })
})

describe('avgAbsDiff', () => {
  it('averages the absolute effective diff across records that have one', () => {
    const records = [{ diff: 2 }, { diff: -4 }, { diff: null }]
    expect(avgAbsDiff(records)).toBe(3) // (2 + 4) / 2
  })

  it('returns null when no record has an estimate', () => {
    expect(avgAbsDiff([{ diff: null }])).toBeNull()
    expect(avgAbsDiff([])).toBeNull()
  })
})

describe('avgInterruptionsPerTask', () => {
  it('divides total interruptions by number of finished tasks, not by days', () => {
    const records = [
      { internal: 2, external: 1 },
      { internal: 0, external: 0 },
      { internal: 1, external: 0 },
    ]
    expect(avgInterruptionsPerTask(records)).toBeCloseTo(4 / 3)
  })

  it('returns null when no tasks were finished', () => {
    expect(avgInterruptionsPerTask([])).toBeNull()
  })
})

describe('trendDirection', () => {
  it('reports up/down/flat based on current vs previous', () => {
    expect(trendDirection(5, 3)).toBe('up')
    expect(trendDirection(3, 5)).toBe('down')
    expect(trendDirection(3, 3)).toBe('flat')
  })

  it('treats a missing side as flat rather than throwing', () => {
    expect(trendDirection(null, 3)).toBe('flat')
    expect(trendDirection(3, null)).toBe('flat')
  })
})

describe('countTicksInDates / recordsInDates', () => {
  it('filters by type and date membership', () => {
    const ticks = [
      { type: 'pomodoro', date: '2026-01-01' },
      { type: 'pomodoro', date: '2026-01-02' },
      { type: 'interruption-internal', date: '2026-01-01' },
    ]
    expect(countTicksInDates(ticks, 'pomodoro', ['2026-01-01'])).toBe(1)
    expect(countTicksInDates(ticks, 'interruption-internal', ['2026-01-01'])).toBe(1)
  })

  it('recordsInDates keeps only records whose date is in the list', () => {
    const records = [{ date: '2026-01-01' }, { date: '2026-01-05' }]
    expect(recordsInDates(records, ['2026-01-01'])).toEqual([{ date: '2026-01-01' }])
  })
})

describe('recordsWithEffectiveDiff', () => {
  it('drops records with no estimate at all', () => {
    const records = [{ diff: 1 }, { diff: null, diffI: null, diffII: null }]
    expect(recordsWithEffectiveDiff(records)).toEqual([{ diff: 1 }])
  })
})

describe('takeLast', () => {
  it('keeps the last N in the same (chronological) order', () => {
    expect(takeLast([1, 2, 3, 4, 5], 2)).toEqual([4, 5])
  })
})

describe('hasNoHistoryYet', () => {
  const today = todayString()

  it('is true when every tick and record is dated today', () => {
    const ticks = [{ date: today }, { date: today }]
    const records = [{ date: today }]
    expect(hasNoHistoryYet(ticks, records)).toBe(true)
  })

  it('is false as soon as any tick or record has an earlier date', () => {
    expect(hasNoHistoryYet([{ date: today }, { date: '2020-01-01' }], [])).toBe(false)
    expect(hasNoHistoryYet([{ date: today }], [{ date: '2020-01-01' }])).toBe(false)
  })

  it('is false when there is no data at all (not a history gap, just an empty state)', () => {
    expect(hasNoHistoryYet([], [])).toBe(false)
  })
})

describe('date window helpers', () => {
  it('this-week and last-week windows are adjacent, non-overlapping, 7-day ranges', () => {
    const thisWeek = datesForThisWeek()
    const lastWeek = datesForLastWeek()
    expect(thisWeek).toHaveLength(7)
    expect(lastWeek).toHaveLength(7)
    const overlap = thisWeek.filter((d) => lastWeek.includes(d))
    expect(overlap).toHaveLength(0)
  })

  it('yesterday is a single day, and falls inside the this-week rolling window', () => {
    const yesterday = datesForYesterday()
    expect(yesterday).toHaveLength(1)
    expect(datesForThisWeek()).toContain(yesterday[0])
  })

  it('datesForPeriod sizes the window per period key, defaulting to week for an unknown key', () => {
    expect(datesForPeriod('today')).toHaveLength(1)
    expect(datesForPeriod('week')).toHaveLength(7)
    expect(datesForPeriod('month')).toHaveLength(30)
    expect(datesForPeriod('year')).toHaveLength(365)
    expect(datesForPeriod('bogus')).toHaveLength(7)
  })
})
