import { useStreak } from '../hooks/useStreak'
import { STREAK_MILESTONES } from '../lib/streak'
import { useTranslation } from '../hooks/useTranslation'

// Settings > Achievements — sits alongside CardCollectionStats as a first,
// simple step toward a unified achievements system later (see
// motivationStats.achievementsFooter's own "planned for a future update"
// note); not building that whole system now. Reached/locked is derived live
// from longestStreak() (src/lib/streak.js), never a separate "seen" list —
// same derive-don't-duplicate principle as the rest of the streak feature.
function StreakMilestones() {
  const { t } = useTranslation()
  const { currentStreak, longestStreak } = useStreak()

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4">
      <p className="text-sage text-[10px] font-sans tracking-widest uppercase mb-1">
        {t('streakMilestones.title')}
      </p>
      <p className="text-sage/70 text-xs font-sans mb-3">
        {t('streakMilestones.summary', { current: currentStreak, longest: longestStreak })}
      </p>
      <div className="flex flex-wrap gap-2">
        {STREAK_MILESTONES.map((milestone) => {
          const reached = longestStreak >= milestone
          return (
            <span
              key={milestone}
              className={
                'font-sans text-xs px-3 py-1.5 rounded-full border ' +
                (reached ? 'bg-tomato/15 border-tomato/60 text-tomato' : 'border-cream/15 text-sage/50')
              }
              aria-label={`${t('streakMilestones.milestoneLabel', { days: milestone })} — ${
                reached ? t('streakMilestones.reachedAria') : t('streakMilestones.lockedAria')
              }`}
            >
              {t('streakMilestones.milestoneLabel', { days: milestone })}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default StreakMilestones
