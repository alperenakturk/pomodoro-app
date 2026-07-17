import { describe, it, expect } from 'vitest'
import {
  ACHIEVEMENT_DEFINITIONS,
  buildAchievementSnapshot,
  evaluateAchievements,
  getCategoryProgress,
} from './achievements'
import { summarizeCardDraws } from './motivationCategories'

const SETTINGS = { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }

function pom(date, timestamp = `${date}T12:00:00.000Z`) {
  return { id: `pom-${date}-${timestamp}`, type: 'pomodoro', date, timestamp }
}

function breakTick(type, date, index = 0) {
  return { id: `${type}-${date}-${index}`, type, date, timestamp: `${date}T12:00:00.000Z` }
}

function snapshot(overrides = {}) {
  return buildAchievementSnapshot({
    ticks: [],
    activityLog: [],
    cardDraws: [],
    voidLog: [],
    settings: SETTINGS,
    ...overrides,
  })
}

describe('evaluateAchievements — dailyPomodoroCount tier boundaries', () => {
  it('does not unlock the 4-tier at 3 same-day pomodoros', () => {
    const ticks = ['2026-07-01', '2026-07-01', '2026-07-01'].map((d, i) => pom(d, `t${i}`))
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('dailyPomodoroCount-4')).toBe(false)
    expect(unlocked.has('dailyPomodoroCount-1')).toBe(true)
  })

  it('unlocks the 4-tier at exactly 4 same-day pomodoros', () => {
    const ticks = [0, 1, 2, 3].map((i) => pom('2026-07-01', `t${i}`))
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('dailyPomodoroCount-4')).toBe(true)
    expect(unlocked.has('dailyPomodoroCount-8')).toBe(false)
  })

  it('uses the single busiest day, not the sum across days', () => {
    const ticks = [
      ...[0, 1].map((i) => pom('2026-07-01', `a${i}`)),
      ...[0, 1].map((i) => pom('2026-07-02', `b${i}`)),
    ]
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('dailyPomodoroCount-4')).toBe(false)
  })
})

describe('evaluateAchievements — cumulativeFocusHours', () => {
  it('derives hours from pomodoro tick count * workMinutes', () => {
    // 25 minutes/pomodoro * 60 pomodoros = 1500 minutes = 25 hours
    const ticks = Array.from({ length: 60 }, (_, i) => pom('2026-07-01', `t${i}`))
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('cumulativeFocusHours-25')).toBe(true)
    expect(unlocked.has('cumulativeFocusHours-50')).toBe(false)
  })
})

describe('evaluateAchievements — cumulativeBreakHours', () => {
  it('reads only break-short/break-long ticks, ignoring pomodoro/pause/interruption', () => {
    const ticks = [
      pom('2026-07-01'),
      { id: 'p1', type: 'pause', date: '2026-07-01', timestamp: '2026-07-01T00:00:00.000Z' },
      { id: 'i1', type: 'interruption-internal', date: '2026-07-01', timestamp: '2026-07-01T00:00:00.000Z' },
      // 60 short breaks * 5 min = 300 min = 5 hours
      ...Array.from({ length: 60 }, (_, i) => breakTick('break-short', '2026-07-01', i)),
    ]
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('cumulativeBreakHours-5')).toBe(true)
    expect(unlocked.has('cumulativeBreakHours-15')).toBe(false)
  })

  it('long breaks accrue at longBreakMinutes, not shortBreakMinutes', () => {
    // 20 long breaks * 15 min = 300 min = 5 hours
    const ticks = Array.from({ length: 20 }, (_, i) => breakTick('break-long', '2026-07-01', i))
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('cumulativeBreakHours-5')).toBe(true)
  })
})

describe('evaluateAchievements — cumulativeTasksCompleted', () => {
  it('counts activityLog rows directly, at the tier boundary', () => {
    const activityLog = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, categoryIds: [] }))
    const unlocked = evaluateAchievements(snapshot({ activityLog }))
    expect(unlocked.has('cumulativeTasksCompleted-5')).toBe(true)
    expect(unlocked.has('cumulativeTasksCompleted-25')).toBe(false)
  })
})

describe('evaluateAchievements — activeDaysLifetime', () => {
  it('counts distinct pomodoro dates, non-consecutive days included', () => {
    const ticks = [pom('2026-01-01'), pom('2026-03-15'), pom('2026-07-01')]
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('activeDaysLifetime-1')).toBe(true)
    expect(unlocked.has('activeDaysLifetime-7')).toBe(false)
  })

  it('multiple pomodoros on the same day only count once', () => {
    const ticks = [pom('2026-01-01', 'a'), pom('2026-01-01', 'b'), pom('2026-01-01', 'c')]
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('activeDaysLifetime-1')).toBe(true)
  })
})

describe('evaluateAchievements — motivation card categories match summarizeCardDraws', () => {
  const cardDraws = [
    { category: 'focusDiscipline', isRare: false, timestamp: '2026-01-01T00:00:00.000Z' },
    { category: 'selfCompassion', isRare: false, timestamp: '2026-01-02T00:00:00.000Z' },
    { category: 'rare', isRare: true, timestamp: '2026-01-03T00:00:00.000Z' },
  ]

  it('motivationCardsDraws mirrors summarizeCardDraws().totalDraws', () => {
    const expected = summarizeCardDraws(cardDraws).totalDraws
    const unlocked = evaluateAchievements(snapshot({ cardDraws }))
    expect(unlocked.has('motivationCardsDraws-1')).toBe(expected >= 1)
  })

  it('motivationCardsRare mirrors summarizeCardDraws().rareCount', () => {
    const expected = summarizeCardDraws(cardDraws).rareCount
    expect(expected).toBe(1)
    const unlocked = evaluateAchievements(snapshot({ cardDraws }))
    expect(unlocked.has('motivationCardsRare-1')).toBe(true)
    expect(unlocked.has('motivationCardsRare-5')).toBe(false)
  })

  it('motivationCardsDiscovery mirrors summarizeCardDraws().distinctCategoriesSeen', () => {
    const expected = summarizeCardDraws(cardDraws).distinctCategoriesSeen
    expect(expected).toBe(3)
    const unlocked = evaluateAchievements(snapshot({ cardDraws }))
    expect(unlocked.has('motivationCardsDiscovery-5')).toBe(false)
  })
})

describe('evaluateAchievements — firsts', () => {
  it('firsts-task-1 unlocks on the first finished task, independent of cumulativeTasksCompleted', () => {
    const activityLog = [{ id: 't1', categoryIds: [] }]
    const unlocked = evaluateAchievements(snapshot({ activityLog }))
    expect(unlocked.has('firsts-task-1')).toBe(true)
    expect(unlocked.has('cumulativeTasksCompleted-5')).toBe(false)
  })

  it('firsts-break-1 unlocks on the first break tick of either type', () => {
    const ticks = [breakTick('break-short', '2026-07-01')]
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('firsts-break-1')).toBe(true)
  })
})

describe('evaluateAchievements — resilience', () => {
  it('counts interruption ticks, never voids', () => {
    const ticks = [
      { id: 'i1', type: 'interruption-internal', date: '2026-07-01', timestamp: '2026-07-01T00:00:00.000Z' },
      { id: 'i2', type: 'interruption-external', date: '2026-07-01', timestamp: '2026-07-01T00:00:00.000Z' },
    ]
    const unlocked = evaluateAchievements(snapshot({ ticks }))
    expect(unlocked.has('resilience-1')).toBe(true)
    expect(unlocked.has('resilience-10')).toBe(false)
  })
})

describe('evaluateAchievements — categoryDiversity', () => {
  it('counts distinct categoryIds across finished tasks', () => {
    const activityLog = [
      { id: 't1', categoryIds: ['cat-a', 'cat-b'] },
      { id: 't2', categoryIds: ['cat-b', 'cat-c'] },
    ]
    const unlocked = evaluateAchievements(snapshot({ activityLog }))
    expect(unlocked.has('categoryDiversity-2')).toBe(true)
    expect(unlocked.has('categoryDiversity-4')).toBe(false)
  })
})

describe('evaluateAchievements — earlyBird / nightOwl hour boundaries', () => {
  it('7:59 local counts as earlyBird, 8:00 local does not', () => {
    const before = evaluateAchievements(
      snapshot({ ticks: [pom('2026-07-01', '2026-07-01T07:59:00')] })
    )
    const at = evaluateAchievements(snapshot({ ticks: [pom('2026-07-01', '2026-07-01T08:00:00')] }))
    expect(before.has('earlyBird-1')).toBe(true)
    expect(at.has('earlyBird-1')).toBe(false)
  })

  it('21:59 local does not count as nightOwl, 22:00 local does', () => {
    const before = evaluateAchievements(
      snapshot({ ticks: [pom('2026-07-01', '2026-07-01T21:59:00')] })
    )
    const at = evaluateAchievements(snapshot({ ticks: [pom('2026-07-01', '2026-07-01T22:00:00')] }))
    expect(before.has('nightOwl-1')).toBe(false)
    expect(at.has('nightOwl-1')).toBe(true)
  })
})

describe('evaluateAchievements — reflectivePause', () => {
  it('ignores void-log entries with an empty or whitespace-only reason', () => {
    const voidLog = [
      { id: 'v1', reason: '' },
      { id: 'v2', reason: '   ' },
    ]
    const unlocked = evaluateAchievements(snapshot({ voidLog }))
    expect(unlocked.has('reflectivePause-1')).toBe(false)
  })

  it('counts an entry with a real reason', () => {
    const voidLog = [{ id: 'v1', reason: 'got pulled into a meeting' }]
    const unlocked = evaluateAchievements(snapshot({ voidLog }))
    expect(unlocked.has('reflectivePause-1')).toBe(true)
  })
})

describe('getCategoryProgress', () => {
  it('reports currentTier/nextTier at a mid-category boundary', () => {
    const ticks = [0, 1, 2, 3].map((i) => pom('2026-07-01', `t${i}`))
    const progress = getCategoryProgress('dailyPomodoroCount', snapshot({ ticks }))
    expect(progress.value).toBe(4)
    expect(progress.currentTier.threshold).toBe(4)
    expect(progress.nextTier.threshold).toBe(8)
  })

  it('nextTier is null once every tier in the category is passed', () => {
    const ticks = Array.from({ length: 30 }, (_, i) => pom('2026-07-01', `t${i}`))
    const progress = getCategoryProgress('dailyPomodoroCount', snapshot({ ticks }))
    expect(progress.currentTier.threshold).toBe(24)
    expect(progress.nextTier).toBeNull()
  })

  it('currentTier is null below the first tier', () => {
    const progress = getCategoryProgress('dailyPomodoroCount', snapshot())
    expect(progress.currentTier).toBeNull()
    expect(progress.nextTier.threshold).toBe(1)
  })
})

describe('ACHIEVEMENT_DEFINITIONS shape', () => {
  it('every definition id is unique', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every definition id encodes its own threshold (firsts uses its own naming since two defs share a category)', () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (def.categoryId === 'firsts') {
        expect(def.id.endsWith(`-${def.threshold}`)).toBe(true)
      } else {
        expect(def.id).toBe(`${def.categoryId}-${def.threshold}`)
      }
    }
  })
})
