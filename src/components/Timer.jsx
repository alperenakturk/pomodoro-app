import { usePomodoro } from '../hooks/usePomodoro'

const LABELS = {
  work: 'Çalışma',
  shortBreak: 'Kısa mola',
  longBreak: 'Uzun mola',
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
    start,
    pause,
    reset,
    logInterruption,
  } = usePomodoro({ onWorkComplete, onInterruption })

  const isWork = sessionType === 'work'
  const accentClass = isWork ? 'text-tomato' : 'text-amber'

  return (
    <div className="flex flex-col items-center gap-6">
      <p className={`font-display text-xs tracking-widest uppercase ${accentClass}`}>
        {LABELS[sessionType]} - Tamamlanan: {completedPomodoros}
      </p>

      <p className="font-sans text-sm text-ink min-h-5 text-center">
        {activeTask ? activeTask.text : 'Aktif görev seçilmedi'}
      </p>

      <p className="font-display text-7xl text-ink tracking-tight tabular-nums">
        {formatTime(secondsLeft)}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={isRunning ? pause : start}
          className="font-sans px-7 py-3 rounded-full bg-tomato text-cream font-semibold text-sm tracking-wide"
        >
          {isRunning ? 'Durdur' : 'Başlat'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="font-sans px-7 py-3 rounded-full border border-sage text-ink text-sm tracking-wide"
        >
          Sıfırla
        </button>
      </div>

      {isWork && (
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-sage/30 w-full">
          <p className="text-sage text-xs font-sans">Bir kesinti mi oldu?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => logInterruption('internal')}
              className="font-sans px-4 py-2 rounded-full border border-sage text-ink text-xs"
            >
              İç kesinti
            </button>
            <button
              type="button"
              onClick={() => logInterruption('external')}
              className="font-sans px-4 py-2 rounded-full border border-sage text-ink text-xs"
            >
              Dış kesinti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timer
