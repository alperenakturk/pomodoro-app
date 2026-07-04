import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'
import { loadTicks } from '../lib/storage'

vi.mock('../lib/alert', () => ({
  unlockAudio: vi.fn(),
  playChime: vi.fn(),
  requestNotificationPermission: vi.fn(),
  notify: vi.fn(),
}))

function tick(seconds) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

describe('usePomodoro', () => {
  it('starts idle in a 25-minute work session', () => {
    const { result } = renderHook(() => usePomodoro())
    expect(result.current.sessionType).toBe('work')
    expect(result.current.secondsLeft).toBe(25 * 60)
    expect(result.current.isRunning).toBe(false)
    expect(result.current.completedPomodoros).toBe(0)
  })

  it('counts down once started', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    tick(5)
    expect(result.current.secondsLeft).toBe(25 * 60 - 5)
  })

  // Rule 1: a voided Pomodoro resets without writing a tick — it never happened.
  it('voidPomodoro resets the timer and writes no tick', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    tick(10)
    act(() => result.current.voidPomodoro())

    expect(result.current.isRunning).toBe(false)
    expect(result.current.secondsLeft).toBe(25 * 60)
    expect(result.current.completedPomodoros).toBe(0)
    expect(loadTicks().filter((t) => t.type === 'pomodoro')).toHaveLength(0)
  })

  it('ringing a full work session records a tick and moves to short break', () => {
    const onWorkComplete = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onWorkComplete }))
    act(() => result.current.start())
    tick(25 * 60)

    expect(result.current.sessionType).toBe('shortBreak')
    expect(result.current.completedPomodoros).toBe(1)
    expect(onWorkComplete).toHaveBeenCalledTimes(1)
    expect(loadTicks().filter((t) => t.type === 'pomodoro')).toHaveLength(1)
  })

  // finishEarly is the deliberate "Finish Pomodoro" escape hatch — unlike void,
  // it counts as a completed Pomodoro (writes a tick).
  it('finishEarly completes the work session early and still records a tick', () => {
    const onWorkComplete = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onWorkComplete }))
    act(() => result.current.start())
    tick(10)
    act(() => result.current.finishEarly())

    expect(result.current.sessionType).toBe('shortBreak')
    expect(result.current.completedPomodoros).toBe(1)
    expect(onWorkComplete).toHaveBeenCalledTimes(1)
    expect(loadTicks().filter((t) => t.type === 'pomodoro')).toHaveLength(1)
  })

  it('finishEarly does nothing outside of a running work session', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.finishEarly())
    expect(result.current.sessionType).toBe('work')
    expect(result.current.completedPomodoros).toBe(0)
  })

  // Rule 3: after `cycleLength` Pomodoros, a long break follows instead of a short one.
  it('moves to a long break after cycleLength Pomodoros, and resets the count once it ends', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.setCycleLength(2))

    act(() => result.current.start())
    tick(25 * 60) // 1st pomodoro -> short break
    expect(result.current.sessionType).toBe('shortBreak')

    act(() => result.current.start())
    tick(5 * 60) // short break ends -> work
    expect(result.current.sessionType).toBe('work')

    act(() => result.current.start())
    tick(25 * 60) // 2nd pomodoro -> long break (cycleLength reached)
    expect(result.current.sessionType).toBe('longBreak')
    expect(result.current.completedPomodoros).toBe(2)

    act(() => result.current.start())
    tick(15 * 60) // long break ends -> work, count resets
    expect(result.current.sessionType).toBe('work')
    expect(result.current.completedPomodoros).toBe(0)
  })

  it('switchSession jumps directly to the requested session', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.switchSession('longBreak'))
    expect(result.current.sessionType).toBe('longBreak')
    expect(result.current.secondsLeft).toBe(15 * 60)
    expect(result.current.isRunning).toBe(false)
  })

  it('logs and undoes interruptions without affecting the timer', () => {
    const onInterruption = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onInterruption }))
    act(() => result.current.start())

    act(() => result.current.logInterruption('internal'))
    expect(result.current.internalCount).toBe(1)
    expect(result.current.isRunning).toBe(true)
    expect(loadTicks().filter((t) => t.type === 'interruption-internal')).toHaveLength(1)

    act(() => result.current.undoInterruption('internal'))
    expect(result.current.internalCount).toBe(0)
    expect(loadTicks().filter((t) => t.type === 'interruption-internal')).toHaveLength(0)

    expect(onInterruption).toHaveBeenCalledWith('internal', 1)
    expect(onInterruption).toHaveBeenCalledWith('internal', -1)
  })
})
