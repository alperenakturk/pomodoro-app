import AchievementIcon from './AchievementIcon'
import { useTranslation } from '../../hooks/useTranslation'

// A single tier tile — reuses StreakMilestones.jsx's proven locked/unlocked
// color pair verbatim (bg-tomato/15 border-tomato/60 text-tomato unlocked,
// border-cream/15 text-sage/50 locked) so this reads as the same visual
// language as the pill row it's replacing, just with an icon added since 14
// categories need a quick visual identifier a plain number can't give.
// 44px min side for a real touch target, not just an icon glyph.
function AchievementBadge({ definition, unlocked, title, description }) {
  const { t } = useTranslation()
  return (
    <div
      className={
        'group relative flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl border flex-shrink-0 ' +
        (unlocked ? 'bg-tomato/15 border-tomato/60 text-tomato' : 'border-cream/15 text-sage/40')
      }
      role="img"
      aria-label={`${title} — ${unlocked ? t('achievements.grid.unlockedAria') : t('achievements.grid.lockedAria')}. ${description}`}
      title={`${title} — ${description}`}
    >
      <AchievementIcon icon={definition.icon} className="w-5 h-5" />
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
