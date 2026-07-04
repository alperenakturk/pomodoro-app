import { useState } from 'react'
import { loadSettings } from '../lib/storage'

const WORK_MIN = 25
const SHORT_BREAK_MIN = 5
const LONG_BREAK_MIN = 15

// Simulates work/break cycles to see how many full Pomodoros fit in the
// available time — the "how many Pomodoros are actually available today"
// planning step the methodology calls for before filling Today's Tasks.
function countAvailablePomodoros(availableMinutes, cycleLength) {
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

function AvailablePomodoros({ plannedTotal }) {
  const [hours, setHours] = useState('')
  const cycleLength = loadSettings().cycleLength

  const available =
    hours === '' ? null : countAvailablePomodoros(Math.max(0, Number(hours) * 60), cycleLength)

  const overPlanned = available != null && plannedTotal > available

  return (
    <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 mb-4 font-sans">
      <div className="flex items-center gap-2">
        <label htmlFor="available-hours" className="text-sage text-xs whitespace-nowrap">
          Hours available today
        </label>
        <input
          id="available-hours"
          type="number"
          min="0"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="e.g. 6"
          className="w-16 bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
        />
      </div>
      {available != null && (
        <p className="text-xs mt-2">
          <span className="text-cream font-semibold">{available}</span>{' '}
          <span className="text-sage">Pomodoros available</span>
          {' · '}
          <span className={overPlanned ? 'text-tomato font-semibold' : 'text-sage'}>
            {plannedTotal} planned
          </span>
          {overPlanned && (
            <span className="text-tomato"> — over capacity, trim today's list</span>
          )}
        </p>
      )}
    </div>
  )
}

export default AvailablePomodoros
