import { usePomodoro } from '../hooks/usePomodoro'

const LABELS = {
  work: 'Work',
  shortBreak: 'Short break',
  longBreak: 'Long break',
}

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

  function handleVoid() {
    if (window.confirm('This Pomodoro will be voided and won\'t count. Are you sure?')) {
      voidPomodoro()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className={`font-display text-xs tracking-widest uppercase ${accentClass}`}>
        {LABELS[sessionType]} - Completed: {completedPomodoros}
      </p>

      <p className="font-sans text-sm text-ink min-h-5 text-center">
        {activeTask ? activeTask.text : 'No active task selected'}
      </p>

      <p className="font-display text-7xl text-ink tracking-tight tabular-nums">
        {formatTime(secondsLeft)}
      </p>

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
            className="font-sans px-7 py-3 rounded-full border border-sage text-ink text-sm tracking-wide"
          >
            Skip break
          </button>
        )}
      </div>

      {isWork && (
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-sage/30 w-full">
          <p className="text-sage text-xs font-sans">Had an interruption?</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => logInterruption('internal')}
                className="font-sans px-4 py-2 rounded-full border border-sage text-ink text-xs"
              >
                Internal interruption ({internalCount})
              </button>
              <button
                type="button"
                onClick={() => undoInterruption('internal')}
                disabled={internalCount === 0}
                className="font-sans w-6 h-6 rounded-full border border-sage text-ink text-xs disabled:opacity-30"
                aria-label="undo internal interruption"
              >
                -1
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => logInterruption('external')}
                className="font-sans px-4 py-2 rounded-full border border-sage text-ink text-xs"
              >
                External interruption ({externalCount})
              </button>
              <button
                type="button"
                onClick={() => undoInterruption('external')}
                disabled={externalCount === 0}
                className="font-sans w-6 h-6 rounded-full border border-sage text-ink text-xs disabled:opacity-30"
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
