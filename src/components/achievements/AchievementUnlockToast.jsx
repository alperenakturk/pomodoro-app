import { useEffect, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import AchievementIcon from './AchievementIcon'

const HOLD_MS = 4000
const EXIT_MS = 220

// Anchored top-center banner, not a corner toast-stack popup — same
// "not a generic toast library" spirit as StreakCelebration.jsx, just
// positioned relative to the viewport instead of one specific header pill,
// since an achievement can unlock while any tab is active. Content here is
// real information (which achievement, why it matters), unlike
// StreakCelebration's purely decorative mascot, so — unlike that
// component — this still renders under prefers-reduced-motion; only the
// slide/fade transition is skipped, not the toast itself.
function AchievementUnlockToast({ achievement, onDone }) {
  const { t } = useTranslation()
  const [leaving, setLeaving] = useState(false)
  const reduceMotion =
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)

  useEffect(() => {
    setLeaving(false)
    const holdTimer = setTimeout(() => setLeaving(true), HOLD_MS)
    return () => clearTimeout(holdTimer)
  }, [achievement.id])

  useEffect(() => {
    if (!leaving) return
    if (reduceMotion) {
      onDone()
      return
    }
    const exitTimer = setTimeout(onDone, EXIT_MS)
    return () => clearTimeout(exitTimer)
  }, [leaving, reduceMotion, onDone])

  const animationClass = reduceMotion ? '' : leaving ? 'animate-achievement-toast-out' : 'animate-achievement-toast-in'

  return (
    <div
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm ${animationClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="bg-pine-dark border border-tomato/60 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-tomato/15 border border-tomato/60 text-tomato flex items-center justify-center flex-shrink-0">
          <AchievementIcon icon={achievement.icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-tomato-text text-[10px] font-sans tracking-widest uppercase">
            {t('achievements.toast.unlockedLabel')}
          </p>
          <p className="text-cream text-sm font-sans font-semibold truncate">{t(achievement.titleKey)}</p>
          <p className="text-sage text-xs font-sans truncate">{t(achievement.descriptionKey)}</p>
        </div>
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="text-sage hover:text-cream flex-shrink-0 p-1 -m-1"
          aria-label={t('achievements.toast.dismissAria')}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default AchievementUnlockToast
