const WORK_MIN = 25
const SHORT_BREAK_MIN = 5
const LONG_BREAK_MIN = 15

// Simulates work/break cycles to see how many full Pomodoros fit in the
// available time — the "how many Pomodoros are actually available today"
// planning step the methodology calls for before filling Today's Tasks.
export function countAvailablePomodoros(availableMinutes, cycleLength) {
  let remaining = availableMinutes
  let count = 0
  while (remaining >= WORK_MIN) {
    remaining -= WORK_MIN
    count++
    const isLongBreak = count % cycleLength === 0
    const breakLen = isLongBreak ? LONG_BREAK_MIN : SHORT_BREAK_MIN
    if (remaining < breakLen) break
    remaining -= breakLen
  }
  return count
}
