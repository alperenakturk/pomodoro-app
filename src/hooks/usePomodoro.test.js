import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'
import { loadTicks } from '../lib/storage'

vi.mock('../lib/alert', () => ({
  unlockAudio: vi.fn(),
  playChime: vi.fn(),
  playPing: vi.fn(),
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

  it('voidPomodoro reports the elapsed time and optional reason via onVoid', () => {
    const onVoid = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onVoid }))
    act(() => result.current.start())
    tick(12) // 12s elapsed out of 25*60
    act(() => result.current.voidPomodoro('Got interrupted'))

    expect(onVoid).toHaveBeenCalledTimes(1)
    expect(onVoid).toHaveBeenCalledWith({ reason: 'Got interrupted', elapsedSeconds: 12 })
  })

  it('voidPomodoro defaults to an empty reason when none is given', () => {
    const onVoid = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onVoid }))
    act(() => result.current.start())
    tick(5)
    act(() => result.current.voidPomodoro())

    expect(onVoid).toHaveBeenCalledWith({ reason: '', elapsedSeconds: 5 })
  })

  it('voidPomodoro does not call onVoid outside of a running work session', () => {
    const onVoid = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onVoid }))
    act(() => result.current.switchSession('shortBreak'))
    act(() => result.current.voidPomodoro('irrelevant'))

    expect(onVoid).not.toHaveBeenCalled()
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

  // Per methodology a "Pomodoro" is specifically the work session, so the
  // completion-pulse trigger (used for the ring-pulse animation) should only
  // fire when a Pomodoro rings, not when a break ends.
  it('bumps completionPulseKey when a Pomodoro completes, but not when a break ends', () => {
    const { result } = renderHook(() => usePomodoro())
    expect(result.current.completionPulseKey).toBe(0)

    act(() => result.current.start())
    tick(25 * 60) // work -> short break
    expect(result.current.completionPulseKey).toBe(1)

    act(() => result.current.start())
    tick(5 * 60) // short break -> work
    expect(result.current.completionPulseKey).toBe(1)

    act(() => result.current.start())
    tick(25 * 60) // work -> short break again
    expect(result.current.completionPulseKey).toBe(2)
  })

  // Rule 3: short break 3-5 min recommended, hard bounds 3-10.
  it('setShortBreakMinutes clamps to the 3-10 range and persists', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => result.current.setShortBreakMinutes(1))
    expect(result.current.shortBreakMinutes).toBe(3)

    act(() => result.current.setShortBreakMinutes(20))
    expect(result.current.shortBreakMinutes).toBe(10)

    act(() => result.current.setShortBreakMinutes(4))
    expect(result.current.shortBreakMinutes).toBe(4)

    const { result: resumed } = renderHook(() => usePomodoro())
    expect(resumed.current.shortBreakMinutes).toBe(4)
  })

  // Rule 3: long break 15-30 min recommended, hard bounds 15-60.
  it('setLongBreakMinutes clamps to the 15-60 range and persists', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => result.current.setLongBreakMinutes(5))
    expect(result.current.longBreakMinutes).toBe(15)

    act(() => result.current.setLongBreakMinutes(90))
    expect(result.current.longBreakMinutes).toBe(60)

    act(() => result.current.setLongBreakMinutes(20))
    expect(result.current.longBreakMinutes).toBe(20)

    const { result: resumed } = renderHook(() => usePomodoro())
    expect(resumed.current.longBreakMinutes).toBe(20)
  })

  it('a configured short break duration is used for the actual short-break countdown', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.setShortBreakMinutes(3))

    act(() => result.current.start())
    tick(25 * 60)

    expect(result.current.sessionType).toBe('shortBreak')
    expect(result.current.secondsLeft).toBe(3 * 60)
  })

  it('a configured long break duration is used for the actual long-break countdown', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.setCycleLength(1))
    act(() => result.current.setLongBreakMinutes(20))

    act(() => result.current.start())
    tick(25 * 60)

    expect(result.current.sessionType).toBe('longBreak')
    expect(result.current.secondsLeft).toBe(20 * 60)
  })

  it('switchSession uses the configured break durations', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.setShortBreakMinutes(4))
    act(() => result.current.setLongBreakMinutes(25))

    act(() => result.current.switchSession('shortBreak'))
    expect(result.current.secondsLeft).toBe(4 * 60)

    act(() => result.current.switchSession('longBreak'))
    expect(result.current.secondsLeft).toBe(25 * 60)
  })

  it('restores an in-progress session after a remount (simulated page refresh)', () => {
    const { result, unmount } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    tick(10)
    expect(result.current.secondsLeft).toBe(25 * 60 - 10)

    unmount()

    const { result: resumed } = renderHook(() => usePomodoro())
    expect(resumed.current.sessionType).toBe('work')
    expect(resumed.current.secondsLeft).toBe(25 * 60 - 10)
    expect(resumed.current.isRunning).toBe(true)
  })
})
