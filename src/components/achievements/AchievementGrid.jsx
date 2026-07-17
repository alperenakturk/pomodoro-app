import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DEFINITIONS } from '../../lib/achievements'
import { useTranslation } from '../../hooks/useTranslation'
import AchievementBadge from './AchievementBadge'
import StreakMilestones from '../StreakMilestones'
import CardCollectionStats from '../CardCollectionStats'

// Progressable categories get their own panel (label + "N/threshold"
// micro-progress + tier badge row). The 3 motivation-card categories fold
// into a small companion panel right after the existing CardCollectionStats
// (which already shows draw/rare/discovery stats — a separate near-duplicate
// panel would just repeat those same numbers). The 5 single-tier "novelty"
// categories (firsts x2, earlyBird, nightOwl, reflectivePause) fold into one
// combined "Special" panel instead of five mostly-empty panels — see the
// design direction from the ui-ux-pro-max skill consult for why (14 full
// panels reads as an overwhelming wall; grouping the one-offs cuts that to a
// single section without hiding anything).
const PROGRESS_CATEGORY_IDS = [
  'dailyPomodoroCount',
  'cumulativeFocusHours',
  'cumulativeBreakHours',
  'cumulativeTasksCompleted',
  'activeDaysLifetime',
  'resilience',
  'categoryDiversity',
]
const CARD_ACHIEVEMENT_CATEGORY_IDS = ['motivationCardsDraws', 'motivationCardsRare', 'motivationCardsDiscovery']
const SPECIAL_DEFINITION_IDS = ['firsts-task-1', 'firsts-break-1', 'earlyBird-1', 'nightOwl-1', 'reflectivePause-1']

const CATEGORY_BY_ID = new Map(ACHIEVEMENT_CATEGORIES.map((c) => [c.id, c]))
const DEFINITIONS_BY_CATEGORY = ACHIEVEMENT_DEFINITIONS.reduce((map, def) => {
  if (!map.has(def.categoryId)) map.set(def.categoryId, [])
  map.get(def.categoryId).push(def)
  return map
}, new Map())

function formatProgressValue(unit, value) {
  return unit === 'hours' ? Math.round(value * 10) / 10 : value
}

function ProgressLine({ category, progress, t }) {
  const { value, nextTier } = progress
  if (!nextTier) {
    return <span className="text-tomato text-xs font-sans font-semibold">{t('achievements.grid.allTiersDone')}</span>
  }
  const formatKey =
    category.unit === 'hours'
      ? 'achievements.progress.hoursFormat'
      : category.unit === 'days'
        ? 'achievements.progress.daysFormat'
        : 'achievements.progress.countFormat'
  return (
    <span className="text-sage/70 text-xs font-sans">
      {t(formatKey, { value: formatProgressValue(category.unit, value), threshold: nextTier.threshold })}
    </span>
  )
}

function CategoryPanel({ categoryId, unlockedIds, getCategoryProgress, t }) {
  const category = CATEGORY_BY_ID.get(categoryId)
  const definitions = DEFINITIONS_BY_CATEGORY.get(categoryId) ?? []
  const progress = getCategoryProgress(categoryId)

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-sage text-[10px] font-sans tracking-widest uppercase">{t(category.labelKey)}</p>
        <ProgressLine category={category} progress={progress} t={t} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {definitions.map((def) => (
          <AchievementBadge
            key={def.id}
            definition={def}
            unlocked={unlockedIds.has(def.id)}
            title={t(def.titleKey)}
            description={t(def.descriptionKey)}
          />
        ))}
      </div>
    </div>
  )
}

function CardAchievementsPanel({ unlockedIds, t }) {
  const definitions = CARD_ACHIEVEMENT_CATEGORY_IDS.flatMap((id) => DEFINITIONS_BY_CATEGORY.get(id) ?? [])
  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4">
      <p className="text-sage text-[10px] font-sans tracking-widest uppercase mb-3">
        {t('achievements.grid.cardBadgesTitle')}
      </p>
      <div className="flex flex-wrap gap-2">
        {definitions.map((def) => (
          <AchievementBadge
            key={def.id}
            definition={def}
            unlocked={unlockedIds.has(def.id)}
            title={t(def.titleKey)}
            description={t(def.descriptionKey)}
          />
        ))}
      </div>
    </div>
  )
}

function SpecialPanel({ unlockedIds, t }) {
  const definitions = SPECIAL_DEFINITION_IDS.map((id) => ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id)).filter(
    Boolean
  )
  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4">
      <p className="text-sage text-[10px] font-sans tracking-widest uppercase mb-3">
        {t('achievements.grid.specialTitle')}
      </p>
      <div className="flex flex-wrap gap-2">
        {definitions.map((def) => (
          <AchievementBadge
            key={def.id}
            definition={def}
            unlocked={unlockedIds.has(def.id)}
            title={t(def.titleKey)}
            description={t(def.descriptionKey)}
          />
        ))}
      </div>
    </div>
  )
}

// Settings > Achievements — replaces the old two-panel view (a bare streak
// pill row + card stats) with a full gallery. StreakMilestones and
// CardCollectionStats are rendered here as-is (imported, not re-implemented)
// so their existing derive-from-source-data logic is reused verbatim, not
// duplicated — this component only adds the net-new tier/badge sections
// around them.
function AchievementGrid({ unlockedIds, getCategoryProgress }) {
  const { t } = useTranslation()
  const unlockedCount = unlockedIds.size
  const totalCount = ACHIEVEMENT_DEFINITIONS.length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-cream text-sm font-sans font-semibold">{t('achievements.title')}</p>
        <p className="text-sage/70 text-xs font-sans">
          {t('achievements.summary', { unlocked: unlockedCount, total: totalCount })}
        </p>
      </div>

      <StreakMilestones />

      {PROGRESS_CATEGORY_IDS.map((categoryId) => (
        <CategoryPanel
          key={categoryId}
          categoryId={categoryId}
          unlockedIds={unlockedIds}
          getCategoryProgress={getCategoryProgress}
          t={t}
        />
      ))}

      <CardCollectionStats />
      <CardAchievementsPanel unlockedIds={unlockedIds} t={t} />

      <SpecialPanel unlockedIds={unlockedIds} t={t} />
    </div>
  )
}

export default AchievementGrid
