import { describe, it, expect } from 'vitest'
import { countAvailablePomodoros } from './pomodoroMath'

describe('countAvailablePomodoros', () => {
  it('returns 0 when there is not enough time for a single Pomodoro', () => {
    expect(countAvailablePomodoros(20, 4)).toBe(0)
  })

  it('fits one Pomodoro with no trailing break required', () => {
    expect(countAvailablePomodoros(25, 4)).toBe(1)
  })

  it('accounts for short breaks between Pomodoros', () => {
    // 25 + 5 + 25 = 55: two Pomodoros with one short break between them
    expect(countAvailablePomodoros(55, 4)).toBe(2)
  })

  it('switches to a long break every cycleLength Pomodoros', () => {
    // 4 work + 3 short breaks = 115; the 4th Pomodoro is followed by a long
    // break (15 min) it doesn't have to fit for the 4th to still count
    expect(countAvailablePomodoros(115, 4)).toBe(4)
  })

  it('respects a custom cycle length', () => {
    // With cycleLength 2: work,break,work = 55 minutes exactly fits 2
    expect(countAvailablePomodoros(55, 2)).toBe(2)
  })
})
