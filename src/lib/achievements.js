import { CARD_CATEGORY_IDS, summarizeCardDraws } from './motivationCategories'

// Pure config + evaluation for the Achievements system — same "derive, don't
// duplicate" split as streak.js: this file owns the declarative achievement
// list and the math, storage.js/useAchievements.js own persistence and
// wiring. Every metric is a plain number compared against a threshold
// (including single-tier "first time" achievements, where threshold is just
// 1) so there is exactly one evaluation shape, no separate boolean-predicate
// path.
//
// Persisted achievement ids are '<categoryId>-<threshold>', not
// '<categoryId>-tier<N>' — threshold is stable identity, tier position isn't
// (inserting a new tier later must never reinterpret an already-unlocked
// id). `tier` only drives display order and "next tier" lookups.

// --- Category metric functions ----------------------------------------------
// Each takes the full AchievementSnapshot and returns one number. Called at
// most once per category per evaluateAchievements() call (see the Map cache
// below), no matter how many tiers reference that category.

function datesWithPomodoro(ticks) {
  return new Set(ticks.filter((t) => t.type === 'pomodoro').map((t) => t.date))
}

function maxDailyPomodoroCount(snapshot) {
  const counts = new Map()
  for (const t of snapshot.ticks) {
    if (t.type !== 'pomodoro') continue
    counts.set(t.date, (counts.get(t.date) ?? 0) + 1)
  }
  let max = 0
  for (const count of counts.values()) max = Math.max(max, count)
  return max
}

function cumulativeFocusHours(snapshot) {
  const pomodoroCount = snapshot.ticks.filter((t) => t.type === 'pomodoro').length
  return (pomodoroCount * snapshot.settings.workMinutes) / 60
}

function cumulativeBreakHours(snapshot) {
  const shortCount = snapshot.ticks.filter((t) => t.type === 'break-short').length
  const longCount = snapshot.ticks.filter((t) => t.type === 'break-long').length
  return (
    (shortCount * snapshot.settings.shortBreakMinutes + longCount * snapshot.settings.longBreakMinutes) / 60
  )
}

function cumulativeTasksCompleted(snapshot) {
  return snapshot.activityLog.length
}

function activeDaysLifetime(snapshot) {
  return datesWithPomodoro(snapshot.ticks).size
}

function motivationCardsDraws(snapshot) {
  return summarizeCardDraws(snapshot.cardDraws).totalDraws
}

function motivationCardsRare(snapshot) {
  return summarizeCardDraws(snapshot.cardDraws).rareCount
}

function motivationCardsDiscovery(snapshot) {
  return summarizeCardDraws(snapshot.cardDraws).distinctCategoriesSeen
}

function firstTaskCompleted(snapshot) {
  return snapshot.activityLog.length > 0 ? 1 : 0
}

function firstBreakTaken(snapshot) {
  return snapshot.ticks.some((t) => t.type === 'break-short' || t.type === 'break-long') ? 1 : 0
}

// Positively framed: counts interruptions the user named honestly (Rule 1's
// "internal"/"external" tick types) rather than silently voiding — never
// counts voids themselves, and this category deliberately stops at one tier
// so it never reads as "have more interruptions to unlock more."
function resilienceCount(snapshot) {
  return snapshot.ticks.filter((t) => t.type === 'interruption-internal' || t.type === 'interruption-external')
    .length
}

function categoryDiversityCount(snapshot) {
  const seen = new Set()
  for (const record of snapshot.activityLog) {
    for (const id of record.categoryIds) seen.add(id)
  }
  return seen.size
}

function localHour(timestamp) {
  return timestamp ? new Date(timestamp).getHours() : null
}

function earlyBirdCount(snapshot) {
  return snapshot.ticks.filter((t) => t.type === 'pomodoro' && localHour(t.timestamp) !== null && localHour(t.timestamp) < 8)
    .length
}

function nightOwlCount(snapshot) {
  return snapshot.ticks.filter(
    (t) => t.type === 'pomodoro' && localHour(t.timestamp) !== null && localHour(t.timestamp) >= 22
  ).length
}

// A void logged with an actual reason, not a bare dismissal — framed as
// self-awareness, single tier only, same "not a grind" reasoning as
// earlyBird/nightOwl.
function reflectivePauseCount(snapshot) {
  return snapshot.voidLog.filter((entry) => entry.reason.trim().length > 0).length
}

export const ACHIEVEMENT_CATEGORIES = [
  {
    id: 'dailyPomodoroCount',
    labelKey: 'achievements.categories.dailyPomodoroCount.label',
    icon: 'flame',
    unit: 'count',
    metricFn: maxDailyPomodoroCount,
  },
  {
    id: 'cumulativeFocusHours',
    labelKey: 'achievements.categories.cumulativeFocusHours.label',
    icon: 'hourglass',
    unit: 'hours',
    metricFn: cumulativeFocusHours,
  },
  {
    id: 'cumulativeBreakHours',
    labelKey: 'achievements.categories.cumulativeBreakHours.label',
    icon: 'mug',
    unit: 'hours',
    metricFn: cumulativeBreakHours,
  },
  {
    id: 'cumulativeTasksCompleted',
    labelKey: 'achievements.categories.cumulativeTasksCompleted.label',
    icon: 'checkFlag',
    unit: 'count',
    metricFn: cumulativeTasksCompleted,
  },
  {
    id: 'activeDaysLifetime',
    labelKey: 'achievements.categories.activeDaysLifetime.label',
    icon: 'calendarCheck',
    unit: 'days',
    metricFn: activeDaysLifetime,
  },
  {
    id: 'motivationCardsDraws',
    labelKey: 'achievements.categories.motivationCardsDraws.label',
    icon: 'card',
    unit: 'count',
    metricFn: motivationCardsDraws,
  },
  {
    id: 'motivationCardsRare',
    labelKey: 'achievements.categories.motivationCardsRare.label',
    icon: 'sparkle',
    unit: 'count',
    metricFn: motivationCardsRare,
  },
  {
    id: 'motivationCardsDiscovery',
    labelKey: 'achievements.categories.motivationCardsDiscovery.label',
    icon: 'cards',
    unit: 'count',
    metricFn: motivationCardsDiscovery,
  },
  {
    id: 'firsts',
    labelKey: 'achievements.categories.firsts.label',
    icon: 'star',
    unit: 'count',
    // Not used for progress math (firsts' two defs each have their own
    // dedicated metricFn below, via defMetricOverrides) — kept only so
    // 'firsts' has a valid AchievementCategoryDef entry for grid grouping.
    metricFn: () => 0,
  },
  {
    id: 'resilience',
    labelKey: 'achievements.categories.resilience.label',
    icon: 'compass',
    unit: 'count',
    metricFn: resilienceCount,
  },
  {
    id: 'categoryDiversity',
    labelKey: 'achievements.categories.categoryDiversity.label',
    icon: 'layers',
    unit: 'count',
    metricFn: categoryDiversityCount,
  },
  {
    id: 'earlyBird',
    labelKey: 'achievements.categories.earlyBird.label',
    icon: 'sunrise',
    unit: 'count',
    metricFn: earlyBirdCount,
  },
  {
    id: 'nightOwl',
    labelKey: 'achievements.categories.nightOwl.label',
    icon: 'moon',
    unit: 'count',
    metricFn: nightOwlCount,
  },
  {
    id: 'reflectivePause',
    labelKey: 'achievements.categories.reflectivePause.label',
    icon: 'feather',
    unit: 'count',
    metricFn: reflectivePauseCount,
  },
]

// 'firsts' is the one category whose two definitions each need their own
// metric (first task ever vs. first break ever) rather than sharing their
// category's metricFn — everywhere else, one category = one metric. Keyed by
// definition id so evaluateAchievements/getCategoryProgress can look up the
// right function without a third code path.
const DEFINITION_METRIC_OVERRIDES = {
  'firsts-task-1': firstTaskCompleted,
  'firsts-break-1': firstBreakTaken,
}

function tierDefs(categoryId, icon, tiers) {
  return tiers.map((threshold, index) => ({
    id: `${categoryId}-${threshold}`,
    categoryId,
    tier: index + 1,
    threshold,
    icon,
    titleKey: `achievements.${categoryId}.tier${index + 1}.title`,
    descriptionKey: `achievements.${categoryId}.tier${index + 1}.description`,
  }))
}

export const ACHIEVEMENT_DEFINITIONS = [
  ...tierDefs('dailyPomodoroCount', 'flame', [1, 4, 8, 12, 16, 20, 24]),
  ...tierDefs('cumulativeFocusHours', 'hourglass', [25, 50, 100, 250, 500, 1000]),
  ...tierDefs('cumulativeBreakHours', 'mug', [5, 15, 30, 75, 150, 300]),
  ...tierDefs('cumulativeTasksCompleted', 'checkFlag', [5, 25, 50, 150, 300, 600]),
  ...tierDefs('activeDaysLifetime', 'calendarCheck', [1, 7, 30, 90, 180, 365, 730]),
  ...tierDefs('motivationCardsDraws', 'card', [1]),
  ...tierDefs('motivationCardsRare', 'sparkle', [1, 5, 10]),
  ...tierDefs('motivationCardsDiscovery', 'cards', [CARD_CATEGORY_IDS.length]),
  {
    id: 'firsts-task-1',
    categoryId: 'firsts',
    tier: 1,
    threshold: 1,
    icon: 'checkFlag',
    titleKey: 'achievements.firsts.task.title',
    descriptionKey: 'achievements.firsts.task.description',
  },
  {
    id: 'firsts-break-1',
    categoryId: 'firsts',
    tier: 2,
    threshold: 1,
    icon: 'mug',
    titleKey: 'achievements.firsts.break.title',
    descriptionKey: 'achievements.firsts.break.description',
  },
  ...tierDefs('resilience', 'compass', [1, 10, 25, 50]),
  ...tierDefs('categoryDiversity', 'layers', [2, 4, 6]),
  ...tierDefs('earlyBird', 'sunrise', [1]),
  ...tierDefs('nightOwl', 'moon', [1]),
  ...tierDefs('reflectivePause', 'feather', [1]),
]

const CATEGORY_BY_ID = new Map(ACHIEVEMENT_CATEGORIES.map((c) => [c.id, c]))

function metricForDefinition(def, snapshot, metricCache) {
  const override = DEFINITION_METRIC_OVERRIDES[def.id]
  if (override) return override(snapshot)
  if (metricCache.has(def.categoryId)) return metricCache.get(def.categoryId)
  const category = CATEGORY_BY_ID.get(def.categoryId)
  const value = category.metricFn(snapshot)
  metricCache.set(def.categoryId, value)
  return value
}

// Bundles already-loaded storage.js collections into the shape every
// metricFn expects. No I/O of its own — the hook is responsible for loading.
export function buildAchievementSnapshot({ ticks, activityLog, cardDraws, voidLog, settings }) {
  return { ticks, activityLog, cardDraws, voidLog, settings }
}

// Every category's metric is computed at most once (cached in metricCache),
// regardless of how many tiers/definitions reference it — 49 definitions
// never means 49 full scans of ticks/activityLog/etc.
export function evaluateAchievements(snapshot) {
  const metricCache = new Map()
  const unlocked = new Set()
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const value = metricForDefinition(def, snapshot, metricCache)
    if (value >= def.threshold) unlocked.add(def.id)
  }
  return unlocked
}

// Powers "6/8 pomodoros today"-style micro-progress in the grid.
// currentTier: highest definition in categoryId already reached (or null).
// nextTier: lowest definition in categoryId not yet reached (or null once
// every tier in the category is done).
export function getCategoryProgress(categoryId, snapshot) {
  const metricCache = new Map()
  const defs = ACHIEVEMENT_DEFINITIONS.filter((d) => d.categoryId === categoryId).sort(
    (a, b) => a.threshold - b.threshold
  )
  const value = defs.length > 0 ? metricForDefinition(defs[0], snapshot, metricCache) : 0
  let currentTier = null
  let nextTier = null
  for (const def of defs) {
    if (value >= def.threshold) currentTier = def
    else if (nextTier === null) nextTier = def
  }
  return { value, currentTier, nextTier }
}
