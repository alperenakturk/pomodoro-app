import { useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateLocalized } from '../lib/i18n'
import AchievementIcon from './achievements/AchievementIcon'

// Same dot-status class per day as ActivityHeatmap's own bucket-color
// convention — a filled tomato square for a done day, amber for a
// Streak-Freeze-covered gap, a faint outline for a genuinely missed day, and
// a dashed outline for today when it isn't done yet (still open, not a
// miss).
function dayClass(status) {
  if (status === 'done') return 'bg-tomato'
  if (status === 'frozen') return 'bg-amber'
  if (status === 'pending') return 'border border-dashed border-cream/30'
  return 'bg-cream/10'
}

function SnowflakeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" strokeLinecap="round" />
      <path d="M12 3l-2 2M12 3l2 2M12 21l-2-2M12 21l2-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 7.5l.3 2.8M4.5 7.5l2.8-.3M19.5 7.5l-.3 2.8M19.5 7.5l-2.8-.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 16.5l-.3-2.8M19.5 16.5l-2.8.3M4.5 16.5l.3-2.8M4.5 16.5l2.8.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Opened from the header's streak pill (App.jsx) — same dialog chrome as
// DayReview.jsx (role="dialog", focus trap in/out, rounded-3xl bg-pine).
// Redesigned to share visual language with StreakCelebrationScreen (the
// flame icon, the tomato-accented hero card) rather than reading as a plain
// stats readout — same underlying data as before, no logic changes.
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

  const isActive = currentStreak > 0

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
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <AchievementIcon icon="flame" className="w-5 h-5 text-tomato" />
            <p id="streak-details-heading" className="font-display text-cream font-bold text-sm tracking-widest uppercase">
              {t('streak.detailsTitle')}
            </p>
          </div>
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

        {/* Hero: current streak is the headline stat, tomato-accented once
            it's actually alive (matches the header pill's own "gray flame
            until today's done" convention) rather than sitting as an
            equal-weight twin of "longest" below. */}
        <div
          className={
            'rounded-2xl border px-5 py-6 text-center mb-3 ' +
            (isActive ? 'bg-tomato/10 border-tomato/40' : 'bg-cream/5 border-cream/10')
          }
        >
          <p className={'font-display text-6xl font-extrabold tabular-nums ' + (isActive ? 'text-tomato-text' : 'text-cream')}>
            {currentStreak}
          </p>
          <p className="text-sage text-xs font-sans mt-1">{t('streak.currentStreakLabel', { count: currentStreak })}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 font-sans mb-4">
          <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
            <p className="font-display text-2xl text-cream tabular-nums">{longestStreak}</p>
            <p className="text-sage text-xs mt-1">{t('streak.longestStreakLabel', { count: longestStreak })}</p>
          </div>
          <div
            className={
              'rounded-xl px-3 py-3 text-center border ' +
              (freezeAvailable ? 'bg-freeze/10 border-freeze/40' : 'bg-cream/5 border-cream/10')
            }
          >
            <SnowflakeIcon className={'w-5 h-5 mx-auto mb-1 ' + (freezeAvailable ? 'text-freeze' : 'text-sage/60')} />
            <p className={'text-xs font-sans font-semibold ' + (freezeAvailable ? 'text-freeze-text' : 'text-sage')}>
              {freezeAvailable ? t('streak.freezeAvailableYes') : t('streak.freezeAvailableNo', { days: daysUntilNextFreeze })}
            </p>
          </div>
        </div>

        <p className="text-sage text-xs font-sans mb-4">{t('streak.freezeExplainer')}</p>

        <p className="font-sans text-sm text-cream mb-5">
          {nextMilestone != null
            ? t('streak.nextMilestoneLabel', { days: nextMilestone - currentStreak, milestone: nextMilestone })
            : t('streak.allMilestonesReached')}
        </p>

        <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
          {t('streak.recentDaysCaption')}
        </p>
        <div className="flex gap-1.5 justify-center mb-3" role="img" aria-label={t('streak.recentDaysCaption')}>
          {recentDays.map(({ date, status }) => {
            const labelKey =
              status === 'done' ? 'streak.recentDayDone' : status === 'frozen' ? 'streak.recentDayFrozen' : 'streak.recentDayMissed'
            return (
              <span
                key={date}
                className={`w-3.5 h-3.5 rounded-[4px] ${dayClass(status)}`}
                title={status === 'pending' ? undefined : t(labelKey, { date: formatDateLocalized(date, localeTag) })}
              />
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-4 font-sans text-[10px] text-sage">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-tomato" aria-hidden="true" />
            {t('streak.legendDone')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-amber" aria-hidden="true" />
            {t('streak.legendFrozen')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-cream/10" aria-hidden="true" />
            {t('streak.legendMissed')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default StreakDetailsModal
