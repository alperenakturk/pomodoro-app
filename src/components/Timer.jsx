import { useEffect } from 'react'
import { usePomodoro, DEFAULT_CYCLE_LENGTH } from '../hooks/usePomodoro'
import { unlockAudio, playChime, CHIME_STYLES } from '../lib/alert'

const CHIME_LABELS = {
  classic: 'Classic',
  soft: 'Soft',
  alert: 'Alert',
}

const DEFAULT_TITLE = 'Pomodoro Technique'

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
    cycleLength,
    setCycleLength,
    resetCycleLength,
    chimeStyle,
    setChimeStyle,
    start,
    voidPomodoro,
    finishEarly,
    skipBreak,
    switchSession,
    logInterruption,
    undoInterruption,
  } = usePomodoro({ onWorkComplete, onInterruption })

  // Shows the live countdown in the tab title so it's visible without
  // switching back to this tab; reverts to the default title when idle.
  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(secondsLeft)} · ${LABELS[sessionType]}`
      : DEFAULT_TITLE
  }, [isRunning, secondsLeft, sessionType])

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [])

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
    completedPomodoros > 0 && completedPomodoros % cycleLength === 0
      ? cycleLength
      : completedPomodoros % cycleLength

  function handleVoid() {
    if (window.confirm('This Pomodoro will be voided and won\'t count. Are you sure?')) {
      voidPomodoro()
    }
  }

  function handleFinishEarly() {
    if (
      window.confirm(
        "In the Pomodoro Technique, a Pomodoro isn't split and shouldn't be finished before it rings — the remaining time is meant for overlearning (reviewing what you did). Finish this Pomodoro early anyway and count it as complete?"
      )
    ) {
      finishEarly()
    }
  }

  function handleSwitch(type) {
    if (type === sessionType) return
    if (sessionType === 'work' && isRunning) {
      if (
        !window.confirm(
          "The current Pomodoro will be abandoned before it rings and voided (it won't count). Switch to the break anyway?"
        )
      ) {
        return
      }
    }
    switchSession(type)
  }

  // Keyboard shortcuts. No dependency array — re-subscribing every render is
  // cheap for a single window listener and guarantees the closures above
  // always see the latest state instead of going stale.
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (!isRunning) start()
        return
      }
      if (e.key === 'Escape' && isRunning && isWork) {
        handleVoid()
        return
      }
      if ((e.key === 'f' || e.key === 'F') && isRunning && isWork) {
        handleFinishEarly()
        return
      }
      if (e.key === '1') handleSwitch('work')
      else if (e.key === '2') handleSwitch('shortBreak')
      else if (e.key === '3') handleSwitch('longBreak')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 sm:px-10 py-10 shadow-lg w-full max-w-md flex flex-col items-center gap-6">
      <div className="flex gap-2">
        {SESSION_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleSwitch(type)}
            title={sessionType === type ? undefined : `Switch to ${LABELS[type]}`}
            className={
              'font-display text-[11px] tracking-widest uppercase px-4 py-2 rounded-full border ' +
              (sessionType === type
                ? 'bg-tomato/15 border-tomato/60 text-tomato'
                : 'border-cream/15 text-sage hover:border-cream/30')
            }
          >
            {LABELS[type]}
          </button>
        ))}
      </div>

      <div className="relative w-60 h-60 sm:w-72 sm:h-72">
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
            {Array.from({ length: cycleLength }, (_, i) => (
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

      <div className="flex items-center gap-2 text-sage text-xs font-sans">
        <label htmlFor="cycle-length">Long break every</label>
        <input
          id="cycle-length"
          type="number"
          min="1"
          max="12"
          value={cycleLength}
          onChange={(e) => setCycleLength(Number(e.target.value))}
          className="w-12 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream px-1 py-1"
        />
        <span>pomodoro</span>
        {cycleLength !== DEFAULT_CYCLE_LENGTH && (
          <button
            type="button"
            onClick={resetCycleLength}
            className="underline decoration-dotted text-cream"
            title={`Reset to default (${DEFAULT_CYCLE_LENGTH})`}
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sage text-xs font-sans">
        <label htmlFor="chime-style">Sound</label>
        <select
          id="chime-style"
          value={chimeStyle}
          onChange={(e) => setChimeStyle(e.target.value)}
          className="bg-cream/5 border border-cream/15 rounded-lg text-cream px-2 py-1"
        >
          {CHIME_STYLES.map((style) => (
            <option key={style} value={style}>
              {CHIME_LABELS[style]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            unlockAudio()
            playChime(chimeStyle)
          }}
          className="underline decoration-dotted text-cream"
        >
          Test
        </button>
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
        {isRunning && isWork && (
          <button
            type="button"
            onClick={handleFinishEarly}
            className="font-sans px-7 py-3 rounded-full border border-sage text-sage font-semibold text-sm tracking-wide"
          >
            Finish Pomodoro
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

      <p className="text-sage/60 text-[10px] font-sans tracking-wide" title="Keyboard shortcuts">
        Space start · Esc void · F finish · 1/2/3 switch
      </p>

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
