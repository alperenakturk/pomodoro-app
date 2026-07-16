import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStreak } from './useStreak'
import { saveTicks, addTick, loadSettings } from '../lib/storage'

const today = new Date().toISOString().slice(0, 10)
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

beforeEach(() => {
  localStorage.clear()
})

describe('useStreak', () => {
  it('is 0 with no history, and bootstraps a first Streak Freeze as available', () => {
    const { result } = renderHook(() => useStreak())
    expect(result.current.currentStreak).toBe(0)
    expect(result.current.todayDone).toBe(false)
    expect(result.current.freezeAvailable).toBe(true)
    expect(loadSettings().streakFreezeGrantedAt).toBe(today)
  })

  it('reflects an existing streak from prior ticks on mount', () => {
    saveTicks([
      { id: '1', type: 'pomodoro', date: daysAgo(2) },
      { id: '2', type: 'pomodoro', date: daysAgo(1) },
      { id: '3', type: 'pomodoro', date: today },
    ])
    const { result } = renderHook(() => useStreak())
    expect(result.current.currentStreak).toBe(3)
    expect(result.current.todayDone).toBe(true)
    // Mounting alone must not fire a celebration for a pre-existing streak.
    expect(result.current.celebration).toBeNull()
  })

  it('fires a one-shot "increment" celebration when a new Pomodoro tick arrives while mounted', () => {
    saveTicks([{ id: '1', type: 'pomodoro', date: daysAgo(1) }])
    const { result } = renderHook(() => useStreak())
    expect(result.current.currentStreak).toBe(1)
    expect(result.current.celebration).toBeNull()

    act(() => {
      addTick({ id: '2', type: 'pomodoro', date: today })
    })

    expect(result.current.currentStreak).toBe(2)
    expect(result.current.celebration).toBe('increment')

    act(() => result.current.clearCelebration())
    expect(result.current.celebration).toBeNull()
  })

  it('fires a "milestone" celebration when the new streak lands exactly on one', () => {
    saveTicks([
      { id: '1', type: 'pomodoro', date: daysAgo(2) },
      { id: '2', type: 'pomodoro', date: daysAgo(1) },
    ])
    const { result } = renderHook(() => useStreak())
    expect(result.current.currentStreak).toBe(2)

    act(() => {
      addTick({ id: '3', type: 'pomodoro', date: today })
    })

    expect(result.current.currentStreak).toBe(3)
    expect(result.current.celebration).toBe('milestone')
  })

  it("fires a 'milestone' (not just 'increment') on a brand new user's very first Pomodoro", () => {
    const { result } = renderHook(() => useStreak())
    expect(result.current.currentStreak).toBe(0)

    act(() => {
      addTick({ id: '1', type: 'pomodoro', date: today })
    })

    expect(result.current.currentStreak).toBe(1)
    expect(result.current.celebration).toBe('milestone')
  })
})
