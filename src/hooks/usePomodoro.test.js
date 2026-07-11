import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'
import { loadTicks } from '../lib/storage'
import { setVolume, startAmbientSound, stopAmbientSound } from '../lib/alert'

vi.mock('../lib/alert', () => ({
  unlockAudio: vi.fn(),
  playChime: vi.fn(),
  playPing: vi.fn(),
  requestNotificationPermission: vi.fn(),
  notify: vi.fn(),
  setVolume: vi.fn(),
  startAmbientSound: vi.fn(),
  stopAmbientSound: vi.fn(),
}))

function tick(seconds) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.clearAllMocks()
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

  // Pause is the deliberate Rule 2 deviation that replaced the old "Finish
  // Pomodoro" escape hatch — unlike finishing early (or void), it doesn't
  // complete or discard the session, just stops the countdown in place,
  // resumable via the same start() from wherever secondsLeft was left.
  it('pause stops the countdown in place and resumes from where it left off', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    tick(10)
    act(() => result.current.pause())

    expect(result.current.isRunning).toBe(false)
    expect(result.current.secondsLeft).toBe(25 * 60 - 10)
    expect(result.current.completedPomodoros).toBe(0)
    expect(result.current.pauseCount).toBe(1)
    expect(loadTicks().filter((t) => t.type === 'pause')).toHaveLength(1)

    act(() => result.current.start())
    tick(5)
    expect(result.current.secondsLeft).toBe(25 * 60 - 15)
  })

  it('pause does nothing while not running', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.pause())
    expect(result.current.pauseCount).toBe(0)
    expect(result.current.isRunning).toBe(false)
    expect(loadTicks().filter((t) => t.type === 'pause')).toHaveLength(0)
  })

  it('pauseCount accumulates across repeated pauses within one session, and resets on the next transition', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    act(() => result.current.pause())
    act(() => result.current.start())
    act(() => result.current.pause())
    expect(result.current.pauseCount).toBe(2)

    act(() => result.current.voidPomodoro())
    expect(result.current.pauseCount).toBe(0)
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

  // Freely adjustable, no recommended-range clamp — only the sane 1-180 bounds.
  it('setWorkMinutes clamps to the 1-180 range and persists', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => result.current.setWorkMinutes(-5))
    expect(result.current.workMinutes).toBe(1)

    act(() => result.current.setWorkMinutes(300))
    expect(result.current.workMinutes).toBe(180)

    act(() => result.current.setWorkMinutes(50))
    expect(result.current.workMinutes).toBe(50)

    const { result: resumed } = renderHook(() => usePomodoro())
    expect(resumed.current.workMinutes).toBe(50)
  })

  it('a configured work duration is used for the actual work countdown', () => {
    const { result } = renderHook(() => usePomodoro())
    // Applies immediately while idle (not just on the next transition) —
    // otherwise pressing Start right after changing the setting would still
    // run the old duration for one more cycle.
    act(() => result.current.setWorkMinutes(10))
    expect(result.current.secondsLeft).toBe(10 * 60)

    act(() => result.current.switchSession('shortBreak'))
    act(() => result.current.switchSession('work'))
    expect(result.current.secondsLeft).toBe(10 * 60)
  })

  it('does not resize secondsLeft while a session is actually running', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    tick(5)
    act(() => result.current.setWorkMinutes(10))

    expect(result.current.isRunning).toBe(true)
    expect(result.current.secondsLeft).toBe(25 * 60 - 5) // unaffected mid-run
  })

  it('voidPomodoro computes elapsed time against the configured work duration', () => {
    const onVoid = vi.fn()
    const { result } = renderHook(() => usePomodoro({ onVoid }))
    act(() => result.current.setWorkMinutes(10))
    act(() => result.current.switchSession('shortBreak'))
    act(() => result.current.switchSession('work'))

    act(() => result.current.start())
    tick(12)
    act(() => result.current.voidPomodoro())

    expect(onVoid).toHaveBeenCalledWith({ reason: '', elapsedSeconds: 12 })
    expect(result.current.secondsLeft).toBe(10 * 60)
  })

  describe('auto-start', () => {
    it('does not auto-start a break after a Pomodoro completes by default', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.start())
      tick(25 * 60)

      expect(result.current.sessionType).toBe('shortBreak')
      expect(result.current.isRunning).toBe(false)
    })

    it('auto-starts the break when autoStartBreaks is enabled', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAutoStartBreaks(true))

      act(() => result.current.start())
      tick(25 * 60)

      expect(result.current.sessionType).toBe('shortBreak')
      expect(result.current.isRunning).toBe(true)
    })

    it('does not auto-start the next Pomodoro after a break ends by default', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.switchSession('shortBreak'))
      act(() => result.current.start())
      tick(5 * 60)

      expect(result.current.sessionType).toBe('work')
      expect(result.current.isRunning).toBe(false)
    })

    it('auto-starts the next Pomodoro when autoStartPomodoros is enabled', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAutoStartPomodoros(true))
      act(() => result.current.switchSession('shortBreak'))
      act(() => result.current.start())
      tick(5 * 60)

      expect(result.current.sessionType).toBe('work')
      expect(result.current.isRunning).toBe(true)
    })

    it('skipBreak also honors autoStartPomodoros', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAutoStartPomodoros(true))
      act(() => result.current.switchSession('shortBreak'))
      act(() => result.current.skipBreak())

      expect(result.current.sessionType).toBe('work')
      expect(result.current.isRunning).toBe(true)
    })

    it('both auto-start toggles persist independently across a remount', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAutoStartBreaks(true))

      const { result: resumed } = renderHook(() => usePomodoro())
      expect(resumed.current.autoStartBreaks).toBe(true)
      expect(resumed.current.autoStartPomodoros).toBe(false)
    })
  })

  describe('sound volume', () => {
    it('setSoundVolume clamps to 0-100, persists, and applies to alert.js', () => {
      const { result } = renderHook(() => usePomodoro())

      act(() => result.current.setSoundVolume(-10))
      expect(result.current.soundVolume).toBe(0)
      expect(setVolume).toHaveBeenLastCalledWith(0)

      act(() => result.current.setSoundVolume(150))
      expect(result.current.soundVolume).toBe(100)

      act(() => result.current.setSoundVolume(40))
      expect(result.current.soundVolume).toBe(40)
      expect(setVolume).toHaveBeenLastCalledWith(40)

      const { result: resumed } = renderHook(() => usePomodoro())
      expect(resumed.current.soundVolume).toBe(40)
    })

    it('applies the persisted volume to alert.js on mount', () => {
      renderHook(() => usePomodoro())
      expect(setVolume).toHaveBeenCalledWith(100) // default
    })
  })

  describe('ambient background sound', () => {
    it('does not play anything by default, even while working', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.start())
      expect(startAmbientSound).not.toHaveBeenCalled()
    })

    it('starts the selected ambient sound when a work session is running', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAmbientSound('rain'))
      act(() => result.current.start())

      expect(startAmbientSound).toHaveBeenCalledWith('rain')
    })

    it('stops the ambient sound when paused', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAmbientSound('ticking'))
      act(() => result.current.start())
      vi.clearAllMocks()

      act(() => result.current.voidPomodoro())
      expect(stopAmbientSound).toHaveBeenCalled()
    })

    it('stops the ambient sound once a work session completes into a break', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAmbientSound('cafe'))
      act(() => result.current.start())
      vi.clearAllMocks()

      tick(25 * 60)
      expect(result.current.sessionType).toBe('shortBreak')
      expect(stopAmbientSound).toHaveBeenCalled()
    })

    it('never plays an ambient sound during a break even if one is selected', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAmbientSound('whiteNoise'))
      act(() => result.current.switchSession('shortBreak'))
      vi.clearAllMocks()

      act(() => result.current.start())
      expect(startAmbientSound).not.toHaveBeenCalled()
    })

    it('setAmbientSound persists across a remount', () => {
      const { result } = renderHook(() => usePomodoro())
      act(() => result.current.setAmbientSound('rain'))

      const { result: resumed } = renderHook(() => usePomodoro())
      expect(resumed.current.ambientSound).toBe('rain')
    })
  })

  // The countdown is driven by an absolute end timestamp, not a per-tick
  // decrement. A remount can't rely on any decrementing history at all — it
  // has to recompute purely from Date.now() vs. the persisted endAt — so
  // this is the clearest way to prove a large real-time gap (the same shape
  // of gap a throttled/backgrounded tab produces, where far fewer interval
  // ticks fire than real seconds actually elapsed) still lands on the exact
  // correct remaining time instead of drifting.
  it('recovers the correct remaining time across a large real-time gap (e.g. a throttled/backgrounded tab)', () => {
    const { result, unmount } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    unmount()

    vi.setSystemTime(new Date(Date.now() + 90 * 1000))

    const { result: resumed } = renderHook(() => usePomodoro())
    expect(resumed.current.secondsLeft).toBe(25 * 60 - 90)
    expect(resumed.current.isRunning).toBe(true)
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
