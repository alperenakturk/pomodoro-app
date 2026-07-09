import { useEffect, useRef } from 'react'
import { diffClass, diffLabel } from '../lib/diffHelpers'
import { todayString, effectiveDiff } from '../lib/reportsMath'

function DayReview({ ticks, activityLog, onClose }) {
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)

  // Move focus into the modal on open, and back to whatever triggered it on
  // close, so keyboard users don't lose their place in the page.
  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  const today = todayString()
  const todaysTicks = ticks.filter((t) => t.date === today)
  const pomodoros = todaysTicks.filter((t) => t.type === 'pomodoro').length
  const internalCount = todaysTicks.filter((t) => t.type === 'interruption-internal').length
  const externalCount = todaysTicks.filter((t) => t.type === 'interruption-external').length

  const todaysRecords = activityLog.filter((r) => r.date === today)
  const unplannedCount = todaysRecords.filter((r) => r.unplanned).length
  const withDiff = todaysRecords.filter((r) => effectiveDiff(r) != null)
  const best = withDiff.length
    ? withDiff.reduce((a, b) => (Math.abs(effectiveDiff(b)) < Math.abs(effectiveDiff(a)) ? b : a))
    : null
  const worst = withDiff.length
    ? withDiff.reduce((a, b) => (Math.abs(effectiveDiff(b)) > Math.abs(effectiveDiff(a)) ? b : a))
    : null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-review-heading"
        className="bg-pine border border-cream/15 rounded-3xl px-6 py-6 sm:px-8 sm:py-8 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <p
            id="day-review-heading"
            className="font-display text-cream font-bold text-sm tracking-widest uppercase"
          >
            Today's Review — {today}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sage text-xl leading-none flex-shrink-0"
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
              <span className={diffClass(effectiveDiff(best))}>({diffLabel(effectiveDiff(best))})</span>
            </p>
          </div>
        )}

        {worst && worst !== best && (
          <div className="mb-6 font-sans text-sm">
            <p className="text-sage text-xs uppercase tracking-wide mb-1">Biggest surprise</p>
            <p className="text-cream">
              {worst.activity}{' '}
              <span className={diffClass(effectiveDiff(worst))}>({diffLabel(effectiveDiff(worst))})</span>
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
                  <span className={diffClass(effectiveDiff(r))}>{diffLabel(effectiveDiff(r))}</span>
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
