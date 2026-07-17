import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAchievements } from './useAchievements'
import { addTick, addActivityRecord, loadAchievementUnlocks, saveAchievementUnlocks } from '../lib/storage'

vi.mock('../lib/alert', () => ({
  playAchievementUnlock: vi.fn(),
}))

import { playAchievementUnlock } from '../lib/alert'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

function pom(id, date, timestamp = `${date}T12:00:00.000Z`) {
  return { id, type: 'pomodoro', date, timestamp }
}

describe('useAchievements — guest mode', () => {
  it('unlocks nothing with no history', () => {
    const { result } = renderHook(() => useAchievements())
    expect(result.current.unlockedIds.size).toBe(0)
    expect(result.current.toastQueue).toHaveLength(0)
  })

  it('does not re-toast an achievement already present in the persisted unlock list on mount', () => {
    // One pomodoro tick satisfies both dailyPomodoroCount-1 and
    // activeDaysLifetime-1 — both must already be persisted, or the unseeded
    // one would (correctly) still queue a toast.
    saveAchievementUnlocks([
      { id: 'u1', achievementId: 'dailyPomodoroCount-1', unlockedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'u2', achievementId: 'activeDaysLifetime-1', unlockedAt: '2026-01-01T00:00:00.000Z' },
    ])
    // Seed ticks that satisfy both directly in storage (bypassing addTick,
    // which would notifyChange and re-trigger evaluation after mount) so
    // this is purely a "mount-time diff against existing history" scenario.
    localStorage.setItem('pomodoro_ticks', JSON.stringify([pom('t1', '2026-07-01')]))

    const { result } = renderHook(() => useAchievements())

    expect(result.current.unlockedIds.has('dailyPomodoroCount-1')).toBe(true)
    expect(result.current.toastQueue).toHaveLength(0)
    expect(playAchievementUnlock).not.toHaveBeenCalled()
  })

  it('plays the full toast queue for a returning user whose existing history already qualifies (no special-cased silent backfill)', () => {
    // No prior achievement_unlocks record exists at all — per the confirmed
    // product decision, this still gets a real toast, same as a live unlock.
    localStorage.setItem('pomodoro_ticks', JSON.stringify([pom('t1', '2026-07-01')]))

    const { result } = renderHook(() => useAchievements())

    expect(result.current.unlockedIds.has('dailyPomodoroCount-1')).toBe(true)
    expect(result.current.toastQueue.some((d) => d.id === 'dailyPomodoroCount-1')).toBe(true)
    expect(playAchievementUnlock).toHaveBeenCalledTimes(1)
    expect(loadAchievementUnlocks().some((u) => u.achievementId === 'dailyPomodoroCount-1')).toBe(true)
  })

  it('a single trigger crossing multiple thresholds queues every newly-unlocked achievement and persists them as one batch', () => {
    const { result } = renderHook(() => useAchievements())
    expect(result.current.toastQueue).toHaveLength(0)

    act(() => {
      // The 4th same-day pomodoro simultaneously crosses dailyPomodoroCount-4,
      // dailyPomodoroCount-1, activeDaysLifetime-1, and firsts-task/break are
      // untouched (no task/break here) — asserting on the two tick-derived
      // ones that definitely fire together.
      addTick(pom('t1', '2026-07-01'))
      addTick(pom('t2', '2026-07-01'))
      addTick(pom('t3', '2026-07-01'))
      addTick(pom('t4', '2026-07-01'))
    })

    const queuedIds = result.current.toastQueue.map((d) => d.id)
    expect(queuedIds).toContain('dailyPomodoroCount-1')
    expect(queuedIds).toContain('dailyPomodoroCount-4')
    expect(queuedIds).toContain('activeDaysLifetime-1')
    // One sound for the whole batch, not once per achievement.
    expect(playAchievementUnlock).toHaveBeenCalledTimes(1)
    expect(loadAchievementUnlocks().length).toBe(queuedIds.length)
  })

  it('dismissToast advances the queue one at a time', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      addActivityRecord({ id: 'a1', date: '2026-07-01', activity: 'Task', categoryIds: [] })
    })
    const initialLength = result.current.toastQueue.length
    expect(initialLength).toBeGreaterThan(0)

    act(() => result.current.dismissToast())
    expect(result.current.toastQueue).toHaveLength(initialLength - 1)
  })

  it('does not unlock a tier one below its threshold', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      addTick(pom('t1', '2026-07-01'))
      addTick(pom('t2', '2026-07-01'))
      addTick(pom('t3', '2026-07-01'))
    })
    expect(result.current.unlockedIds.has('dailyPomodoroCount-4')).toBe(false)
    expect(result.current.unlockedIds.has('dailyPomodoroCount-1')).toBe(true)
  })

  it('getCategoryProgress reflects live progress toward the next tier', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      addTick(pom('t1', '2026-07-01'))
      addTick(pom('t2', '2026-07-01'))
    })
    const progress = result.current.getCategoryProgress('dailyPomodoroCount')
    expect(progress.value).toBe(2)
    expect(progress.nextTier.threshold).toBe(4)
  })
})
