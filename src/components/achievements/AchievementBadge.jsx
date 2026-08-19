import AchievementIcon from './AchievementIcon'
import { useTranslation } from '../../hooks/useTranslation'

// A single tier tile — reuses StreakMilestones.jsx's proven locked/unlocked
// color pair verbatim (bg-tomato/15 border-tomato/60 text-tomato unlocked,
// border-cream/15 text-sage/50 locked) so this reads as the same visual
// language as the pill row it's replacing, just with an icon added since 14
// categories need a quick visual identifier a plain number can't give.
// 44px min side for a real touch target, not just an icon glyph.
//
// lockedForMode is a third, distinct state from the ordinary "not reached
// yet" locked look — a definition gated behind Full mode (see
// achievements.js's requiresFullMode) whose current session isn't in Full
// mode, regardless of whether the metric itself is already satisfied. Full-
// strength sage + a padlock icon instead of the category's own icon, so it
// reads as "known and reachable, just not from here" rather than "not
// achieved yet" (dimmed sage/40 + the normal icon).
function AchievementBadge({ definition, unlocked, lockedForMode, title, description }) {
  const { t } = useTranslation()
  const hint = lockedForMode ? t('achievements.grid.lockedForModeHint') : description
  return (
    <div
      className={
        'group relative flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl border flex-shrink-0 ' +
        (unlocked
          ? 'bg-tomato/15 border-tomato/60 text-tomato'
          : lockedForMode
            ? 'border-cream/25 text-sage'
            : 'border-cream/15 text-sage/40')
      }
      role="img"
      aria-label={`${title} — ${
        lockedForMode
          ? t('achievements.grid.lockedForModeAria')
          : unlocked
            ? t('achievements.grid.unlockedAria')
            : t('achievements.grid.lockedAria')
      }. ${hint}`}
      title={`${title} — ${hint}`}
    >
      <AchievementIcon icon={lockedForMode ? 'lock' : definition.icon} className="w-5 h-5" />
      <span
        className="pointer-events-none absolute -bottom-1.5 -right-1.5 min-w-[16px] px-1 h-4 rounded-full bg-pine-dark border border-cream/15 text-[9px] font-sans font-semibold flex items-center justify-center text-sage"
        aria-hidden="true"
      >
        {definition.tier}
      </span>
    </div>
  )
}

export default AchievementBadge
