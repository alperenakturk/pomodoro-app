import { usePomodoro } from '../hooks/usePomodoro'

const LABELS = {
  work: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
}

const SESSION_ORDER = ['work', 'shortBreak', 'longBreak']

// Presentation-only mirror of usePomodoro's internal durations, used to
// compute ring progress. usePomodoro itself is left untouched.
const DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function Timer({ activeTask, onWorkComplete, onInterruption }) {
  const {
    sessionType,
    secondsLeft,
    isRunning,
    completedPomodoros,
    internalCount,
    externalCount,
    start,
    voidPomodoro,
    skipBreak,
    logInterruption,
    undoInterruption,
  } = usePomodoro({ onWorkComplete, onInterruption })

  const isWork = sessionType === 'work'
  const accentClass = isWork ? 'text-tomato' : 'text-amber'
  const ringClass = isWork ? 'stroke-tomato' : 'stroke-amber'
  const dotClass = isWork ? 'fill-tomato' : 'fill-amber'

  const progress = 1 - secondsLeft / DURATIONS[sessionType]
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const angleRad = ((progress * 360 - 90) * Math.PI) / 180
  const dotX = 50 + RADIUS * Math.cos(angleRad)
  const dotY = 50 + RADIUS * Math.sin(angleRad)

  const filledDots =
    completedPomodoros > 0 && completedPomodoros % 4 === 0 ? 4 : completedPomodoros % 4

  function handleVoid() {
    if (window.confirm('This Pomodoro will be voided and won\'t count. Are you sure?')) {
      voidPomodoro()
    }
  }

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-10 py-10 shadow-lg w-full max-w-md flex flex-col items-center gap-6">
      <div className="flex gap-2">
        {SESSION_ORDER.map((type) => (
          <span
            key={type}
            className={
              'font-display text-[11px] tracking-widest uppercase px-4 py-2 rounded-full border ' +
              (sessionType === type
                ? 'bg-tomato/15 border-tomato/60 text-tomato'
                : 'border-cream/15 text-sage')
            }
          >
            {LABELS[type]}
          </span>
        ))}
      </div>

      <div className="relative w-72 h-72">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="1.5" className="stroke-cream/10" />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={ringClass}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
          />
          <circle cx={dotX} cy={dotY} r="2.2" className={dotClass} />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className={`font-display text-xs tracking-widest uppercase ${accentClass}`}>
            {LABELS[sessionType]}
          </p>
          <p className="font-display text-6xl text-cream tracking-tight tabular-nums">
            {formatTime(secondsLeft)}
          </p>
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <span
                key={i}
                className={
                  'w-2 h-2 rounded-full ' +
                  (i < filledDots ? 'bg-tomato' : 'border border-sage/40')
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sage text-xs font-sans tracking-widest uppercase mb-1">Current task</p>
        <p className="font-sans text-cream font-semibold">
          {activeTask ? activeTask.text : 'No active task selected'}
        </p>
      </div>

      <div className="flex gap-3">
        {!isRunning && (
          <button
            type="button"
            onClick={start}
            className="font-sans px-7 py-3 rounded-full bg-tomato text-cream font-semibold text-sm tracking-wide"
          >
            Start
          </button>
        )}
        {isRunning && isWork && (
          <button
            type="button"
            onClick={handleVoid}
            className="font-sans px-7 py-3 rounded-full border border-tomato text-tomato font-semibold text-sm tracking-wide"
          >
            Void Pomodoro
          </button>
        )}
        {isRunning && !isWork && (
          <button
            type="button"
            onClick={skipBreak}
            className="font-sans px-7 py-3 rounded-full border border-cream/20 text-cream text-sm tracking-wide"
          >
            Skip break
          </button>
        )}
      </div>

      {isWork && (
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-cream/10 w-full">
          <p className="text-sage text-xs font-sans">Had an interruption?</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => logInterruption('internal')}
                className="font-sans px-4 py-2 rounded-full border border-cream/15 text-cream text-xs"
              >
                Internal interruption ({internalCount})
              </button>
              <button
                type="button"
                onClick={() => undoInterruption('internal')}
                disabled={internalCount === 0}
                className="font-sans w-6 h-6 rounded-full border border-cream/15 text-cream text-xs disabled:opacity-30"
                aria-label="undo internal interruption"
              >
                -1
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => logInterruption('external')}
                className="font-sans px-4 py-2 rounded-full border border-cream/15 text-cream text-xs"
              >
                External interruption ({externalCount})
              </button>
              <button
                type="button"
                onClick={() => undoInterruption('external')}
                disabled={externalCount === 0}
                className="font-sans w-6 h-6 rounded-full border border-cream/15 text-cream text-xs disabled:opacity-30"
                aria-label="undo external interruption"
              >
                -1
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timer
