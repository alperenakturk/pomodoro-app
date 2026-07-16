import { useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateLocalized } from '../lib/i18n'

// Same dot-status class per day as StreakCelebration/ActivityHeatmap's own
// bucket-color convention — a filled tomato square for a done day, amber for
// a Streak-Freeze-covered gap, a faint outline for a genuinely missed day,
// and a dashed outline for today when it isn't done yet (still open, not a
// miss).
function dayClass(status) {
  if (status === 'done') return 'bg-tomato'
  if (status === 'frozen') return 'bg-amber'
  if (status === 'pending') return 'border border-dashed border-cream/30'
  return 'bg-cream/10'
}

// Opened from the header's streak pill (App.jsx) — same dialog chrome as
// DayReview.jsx (role="dialog", focus trap in/out, rounded-3xl bg-pine).
function StreakDetailsModal({
  currentStreak,
  longestStreak,
  freezeAvailable,
  daysUntilNextFreeze,
  nextMilestone,
  recentDays,
  onClose,
}) {
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)
  const { t, localeTag } = useTranslation()

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-details-heading"
        className="bg-pine border border-cream/15 rounded-3xl px-6 py-6 sm:px-8 sm:py-8 shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <p id="streak-details-heading" className="font-display text-cream font-bold text-sm tracking-widest uppercase">
            {t('streak.detailsTitle')}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sage text-xl leading-none flex-shrink-0"
            aria-label={t('streak.closeAria')}
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 font-sans mb-6">
          <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
            <p className="font-display text-3xl text-cream tabular-nums">{currentStreak}</p>
            <p className="text-sage text-xs mt-1">{t('streak.currentStreakLabel', { count: currentStreak })}</p>
          </div>
          <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
            <p className="font-display text-3xl text-cream tabular-nums">{longestStreak}</p>
            <p className="text-sage text-xs mt-1">{t('streak.longestStreakLabel', { count: longestStreak })}</p>
          </div>
        </div>

        <div className="font-sans text-sm mb-4">
          <p className={freezeAvailable ? 'text-amber font-semibold' : 'text-sage'}>
            {freezeAvailable
              ? t('streak.freezeAvailableYes')
              : t('streak.freezeAvailableNo', { days: daysUntilNextFreeze })}
          </p>
          <p className="text-sage/60 text-xs mt-1">{t('streak.freezeExplainer')}</p>
        </div>

        <p className="font-sans text-sm text-cream mb-6">
          {nextMilestone != null
            ? t('streak.nextMilestoneLabel', { days: nextMilestone - currentStreak, milestone: nextMilestone })
            : t('streak.allMilestonesReached')}
        </p>

        <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
          {t('streak.recentDaysCaption')}
        </p>
        <div className="flex gap-1.5 justify-center" role="img" aria-label={t('streak.recentDaysCaption')}>
          {recentDays.map(({ date, status }) => {
            const labelKey =
              status === 'done' ? 'streak.recentDayDone' : status === 'frozen' ? 'streak.recentDayFrozen' : 'streak.recentDayMissed'
            return (
              <span
                key={date}
                className={`w-3 h-3 rounded-sm ${dayClass(status)}`}
                title={status === 'pending' ? undefined : t(labelKey, { date: formatDateLocalized(date, localeTag) })}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default StreakDetailsModal
