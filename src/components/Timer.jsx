import { useEffect, useRef, useState } from 'react'
import UnplannedCapture from './UnplannedCapture'

const RING_PULSE_MS = 500

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

// Purely presentational — usePomodoro is instantiated once in App.jsx (not
// here) so the countdown keeps running and is controllable from the Settings
// tab even while the Timer tab isn't the one showing.
function Timer({
  activeTask,
  addTask,
  sessionType,
  secondsLeft,
  isRunning,
  completedPomodoros,
  internalCount,
  externalCount,
  completionPulseKey,
  cycleLength,
  start,
  voidPomodoro,
  finishEarly,
  skipBreak,
  switchSession,
  logInterruption,
  undoInterruption,
}) {
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

  // A brief one-shot ring-pulse whenever a Pomodoro completes.
  // completionPulseKey is reset to 0 on every mount (it isn't persisted), so
  // comparing against a ref — rather than any nonzero value — is what keeps
  // this from firing on mount/refresh, only on an actual increment.
  const [pulsing, setPulsing] = useState(false)
  const prevPulseKeyRef = useRef(completionPulseKey)
  useEffect(() => {
    if (completionPulseKey === prevPulseKeyRef.current) return
    prevPulseKeyRef.current = completionPulseKey
    setPulsing(true)
    const timeoutId = setTimeout(() => setPulsing(false), RING_PULSE_MS)
    return () => clearTimeout(timeoutId)
  }, [completionPulseKey])

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

  // Rule 2 says a Pomodoro always rings and there's no "finish early" —
  // overrunning time is meant for overlearning, not for stopping the clock.
  // We deliberately deviate from that: the confirm dialog *teaches* the rule
  // (spells out what overlearning is and why finishing early isn't the
  // default), but leaves the actual call to the user rather than blocking
  // it outright. Confirming still finishes the Pomodoro as complete (an X
  // is recorded), same as letting it ring naturally.
  function handleFinishEarly() {
    if (
      window.confirm(
        'Pomodoro Technique says a Pomodoro should ring before you stop. If your task is done, consider using the remaining time for overlearning (review/refine). Finish anyway?'
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
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full ${accentClass} ${pulsing ? 'animate-ring-pulse' : ''}`}
        >
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

      {isWork && isRunning && (
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

      <div className="flex flex-col items-center gap-2 pt-4 border-t border-cream/10 w-full">
        <p className="text-sage text-xs font-sans">Unplanned & urgent? Jot it and keep going.</p>
        <UnplannedCapture addTask={addTask} className="w-full" />
      </div>
    </div>
  )
}

export default Timer
