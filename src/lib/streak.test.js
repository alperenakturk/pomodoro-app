import { describe, it, expect } from 'vitest'
import {
  STREAK_MILESTONES,
  currentStreak,
  longestStreak,
  highestMilestoneReached,
  nextMilestone,
  recentDayStatuses,
  reconcileStreakFreeze,
  maybeGrantStreakFreeze,
} from './streak'

function pom(date) {
  return { id: `pom-${date}`, type: 'pomodoro', date }
}

const TODAY = '2026-07-17'
const YESTERDAY = '2026-07-16'

describe('currentStreak', () => {
  it('is 0 with no history', () => {
    expect(currentStreak([], [], TODAY)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const ticks = [pom('2026-07-15'), pom('2026-07-16'), pom(TODAY)]
    expect(currentStreak(ticks, [], TODAY)).toBe(3)
  })

  it('counts from yesterday when today has no Pomodoro yet (not a break)', () => {
    const ticks = [pom('2026-07-15'), pom('2026-07-16')]
    expect(currentStreak(ticks, [], TODAY)).toBe(2)
  })

  it('stops at a genuinely missed day with no freeze', () => {
    const ticks = [pom('2026-07-15'), pom(TODAY)] // 07-16 missing
    expect(currentStreak(ticks, [], TODAY)).toBe(1)
  })

  it('a freeze-covered gap keeps the chain alive without counting the frozen day itself', () => {
    const ticks = [pom('2026-07-15'), pom(TODAY)] // 07-16 missing, but frozen
    expect(currentStreak(ticks, [YESTERDAY], TODAY)).toBe(2)
  })
})

describe('longestStreak', () => {
  it('is 0 with no history', () => {
    expect(longestStreak([], [])).toBe(0)
  })

  it('finds the longest run across all history, not just the most recent', () => {
    const ticks = [
      pom('2026-07-01'), pom('2026-07-02'), pom('2026-07-03'), // run of 3
      pom('2026-07-10'), pom('2026-07-11'), // run of 2
    ]
    expect(longestStreak(ticks, [])).toBe(3)
  })

  it('bridges a frozen gap inside historical data too', () => {
    const ticks = [
      pom('2026-07-01'), pom('2026-07-02'), // 07-03 frozen
      pom('2026-07-04'), pom('2026-07-05'),
    ]
    expect(longestStreak(ticks, ['2026-07-03'])).toBe(4)
  })
})

describe('highestMilestoneReached / nextMilestone', () => {
  it('below the first milestone: nothing reached yet, first is next', () => {
    expect(highestMilestoneReached(0)).toBeNull()
    expect(nextMilestone(0)).toBe(STREAK_MILESTONES[0])
  })

  it('exactly on a milestone', () => {
    expect(highestMilestoneReached(7)).toBe(7)
    expect(nextMilestone(7)).toBe(14)
  })

  it('between milestones reports the lower one reached', () => {
    expect(highestMilestoneReached(5)).toBe(3)
    expect(nextMilestone(5)).toBe(7)
  })

  it('past every milestone: all reached, none next', () => {
    const last = STREAK_MILESTONES[STREAK_MILESTONES.length - 1]
    expect(highestMilestoneReached(last + 100)).toBe(last)
    expect(nextMilestone(last + 100)).toBeNull()
  })
})

describe('recentDayStatuses', () => {
  it('marks kept, frozen, missed, and a not-yet-done today correctly over a short window', () => {
    const ticks = [pom('2026-07-14')] // 15 missing, 16 frozen, today not done yet
    const statuses = recentDayStatuses(ticks, [YESTERDAY], TODAY, 4)
    expect(statuses).toEqual([
      { date: '2026-07-14', status: 'done' },
      { date: '2026-07-15', status: 'missed' },
      { date: YESTERDAY, status: 'frozen' },
      { date: TODAY, status: 'pending' },
    ])
  })

  it("marks today 'done' once it has a Pomodoro", () => {
    const statuses = recentDayStatuses([pom(TODAY)], [], TODAY, 1)
    expect(statuses).toEqual([{ date: TODAY, status: 'done' }])
  })
})

describe('reconcileStreakFreeze', () => {
  it('does nothing when yesterday already has a Pomodoro', () => {
    const ticks = [pom(YESTERDAY)]
    const settings = { streakFreezeAvailable: true, streakFreezeUsedDates: [] }
    expect(reconcileStreakFreeze(settings, ticks, TODAY)).toBeNull()
  })

  it('does nothing when no freeze is available', () => {
    const settings = { streakFreezeAvailable: false, streakFreezeUsedDates: [] }
    expect(reconcileStreakFreeze(settings, [], TODAY)).toBeNull()
  })

  it('does nothing when there was no real streak to protect', () => {
    const settings = { streakFreezeAvailable: true, streakFreezeUsedDates: [] }
    expect(reconcileStreakFreeze(settings, [], TODAY)).toBeNull()
  })

  it('spends the freeze when yesterday is missed and a real streak precedes it', () => {
    const ticks = [pom('2026-07-14'), pom('2026-07-15')] // streak of 2 ending 07-15, then 07-16 missed
    const settings = { streakFreezeAvailable: true, streakFreezeUsedDates: [] }
    expect(reconcileStreakFreeze(settings, ticks, TODAY)).toEqual({
      streakFreezeAvailable: false,
      streakFreezeUsedDates: [YESTERDAY],
    })
  })

  it('is idempotent once yesterday is already recorded as freeze-used', () => {
    const ticks = [pom('2026-07-14'), pom('2026-07-15')]
    const settings = { streakFreezeAvailable: true, streakFreezeUsedDates: [YESTERDAY] }
    expect(reconcileStreakFreeze(settings, ticks, TODAY)).toBeNull()
  })
})

describe('maybeGrantStreakFreeze', () => {
  it('does nothing when a freeze is already available', () => {
    const settings = { streakFreezeAvailable: true, streakFreezeGrantedAt: TODAY }
    expect(maybeGrantStreakFreeze(settings, TODAY)).toBeNull()
  })

  it('bootstraps a brand new account straight to eligible', () => {
    const settings = { streakFreezeAvailable: false, streakFreezeGrantedAt: null }
    expect(maybeGrantStreakFreeze(settings, TODAY)).toEqual({
      streakFreezeAvailable: true,
      streakFreezeGrantedAt: TODAY,
    })
  })

  it('withholds a new grant before the interval has elapsed', () => {
    const settings = { streakFreezeAvailable: false, streakFreezeGrantedAt: '2026-07-11' } // 6 days ago
    expect(maybeGrantStreakFreeze(settings, TODAY)).toBeNull()
  })

  it('grants a new freeze once the interval has elapsed', () => {
    const settings = { streakFreezeAvailable: false, streakFreezeGrantedAt: '2026-07-10' } // 7 days ago
    expect(maybeGrantStreakFreeze(settings, TODAY)).toEqual({
      streakFreezeAvailable: true,
      streakFreezeGrantedAt: TODAY,
    })
  })
})
