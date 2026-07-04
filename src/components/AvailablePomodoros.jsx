import { useState } from 'react'
import { loadSettings } from '../lib/storage'
import { countAvailablePomodoros } from '../lib/pomodoroMath'

function AvailablePomodoros({ plannedTotal, suggestedHours = 0 }) {
  const [hours, setHours] = useState('')
  const cycleLength = loadSettings().cycleLength

  const available =
    hours === '' ? null : countAvailablePomodoros(Math.max(0, Number(hours) * 60), cycleLength)

  const overPlanned = available != null && plannedTotal > available
  const roundedSuggestion = Math.round(suggestedHours * 2) / 2

  return (
    <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 mb-4 font-sans">
      <div className="flex items-center gap-2 flex-wrap">
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
        {roundedSuggestion > 0 && String(roundedSuggestion) !== hours && (
          <button
            type="button"
            onClick={() => setHours(String(roundedSuggestion))}
            className="text-sage text-xs underline decoration-dotted hover:text-tomato"
            title="Fill in from today's timetable blocks"
          >
            Use timetable ({roundedSuggestion}h)
          </button>
        )}
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
