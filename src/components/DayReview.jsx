function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function diffLabel(diff) {
  if (diff == null) return '-'
  return `${diff > 0 ? '+' : ''}${diff}`
}

function diffClass(diff) {
  if (diff == null) return 'text-sage'
  if (diff > 0) return 'text-tomato'
  if (diff < 0) return 'text-amber'
  return 'text-cream'
}

function DayReview({ ticks, activityLog, onClose }) {
  const today = todayString()
  const todaysTicks = ticks.filter((t) => t.date === today)
  const pomodoros = todaysTicks.filter((t) => t.type === 'pomodoro').length
  const internalCount = todaysTicks.filter((t) => t.type === 'interruption-internal').length
  const externalCount = todaysTicks.filter((t) => t.type === 'interruption-external').length

  const todaysRecords = activityLog.filter((r) => r.date === today)
  const unplannedCount = todaysRecords.filter((r) => r.unplanned).length
  const withDiff = todaysRecords.filter((r) => r.diff != null)
  const best = withDiff.length
    ? withDiff.reduce((a, b) => (Math.abs(b.diff) < Math.abs(a.diff) ? b : a))
    : null
  const worst = withDiff.length
    ? withDiff.reduce((a, b) => (Math.abs(b.diff) > Math.abs(a.diff) ? b : a))
    : null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div
        className="bg-pine border border-cream/15 rounded-3xl px-8 py-8 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="font-display text-cream font-bold text-sm tracking-widest uppercase">
            Today's Review — {today}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-sage text-xl leading-none"
            aria-label="close review"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 font-sans mb-6">
          <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
            <p className="font-display text-2xl text-cream">{pomodoros}</p>
            <p className="text-sage text-xs mt-1">Pomodoros completed</p>
          </div>
          <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
            <p className="font-display text-2xl text-cream">{internalCount + externalCount}</p>
            <p className="text-sage text-xs mt-1">Interruptions ({internalCount} internal · {externalCount} external)</p>
          </div>
          <div className="col-span-2 bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
            <p className="font-display text-2xl text-cream">{unplannedCount}</p>
            <p className="text-sage text-xs mt-1">Unplanned tasks</p>
          </div>
        </div>

        {best && (
          <div className="mb-3 font-sans text-sm">
            <p className="text-sage text-xs uppercase tracking-wide mb-1">Most accurate estimate</p>
            <p className="text-cream">
              {best.activity}{' '}
              <span className={diffClass(best.diff)}>({diffLabel(best.diff)})</span>
            </p>
          </div>
        )}

        {worst && worst !== best && (
          <div className="mb-6 font-sans text-sm">
            <p className="text-sage text-xs uppercase tracking-wide mb-1">Biggest surprise</p>
            <p className="text-cream">
              {worst.activity}{' '}
              <span className={diffClass(worst.diff)}>({diffLabel(worst.diff)})</span>
            </p>
          </div>
        )}

        <p className="text-sage text-xs uppercase tracking-wide mb-2">
          Tasks finished today ({todaysRecords.length})
        </p>
        {todaysRecords.length === 0 ? (
          <p className="text-sage text-sm font-sans text-center py-4">
            No tasks finished yet today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 font-sans text-sm">
            {todaysRecords.map((r) => (
              <li key={r.id} className="border-b border-cream/10 pb-2 flex justify-between">
                <span className="text-cream">{r.activity}</span>
                <span className="text-sage text-xs flex gap-2">
                  <span>Est. {r.estimate ?? '-'}</span>
                  <span>Real {r.real}</span>
                  <span className={diffClass(r.diff)}>{diffLabel(r.diff)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default DayReview
