import { countTicksInDates, datesForThisWeek, todayString } from './reportsMath'

// The 5 "normal" categories a card draw rolls across, plus the independent
// Rare roll (see RARE_CARD_CHANCE below) — kept separate from
// CARD_CATEGORY_IDS since Rare isn't part of the weighted category pick at
// all, it pre-empts it. RARE_CATEGORY_ID is exported so callers (stats view,
// storage) don't have to spell the string 'rare' themselves.
export const CARD_CATEGORY_IDS = [
  'focusDiscipline',
  'selfCompassion',
  'tomatoManJokes',
  'funFact',
  'personalStatCard',
]
export const RARE_CATEGORY_ID = 'rare'
export const ALL_CATEGORY_IDS = [...CARD_CATEGORY_IDS, RARE_CATEGORY_ID]

// --- Tunable rarity/weight constants --------------------------------------
// All placeholder/adjustable per the design brief — named here so a future
// pass can rebalance without touching drawCard()'s logic.

// Independent 2% roll, checked before the category weights below even apply
// — 98% of draws roll normally across the 5 categories.
export const RARE_CARD_CHANCE = 0.02

// Equal weights today; bump any one of these to bias the draw later.
export const CATEGORY_WEIGHTS = {
  focusDiscipline: 1,
  selfCompassion: 1,
  tomatoManJokes: 1,
  funFact: 1,
  personalStatCard: 1,
}

// focusDiscipline's 3 equally-likely voices: a generically-framed notable
// figure (never a named real person, to avoid misattribution), an original
// archetypal fictional voice (never a real copyrighted character/line), or
// an anonymous/proverb-style line.
export const FOCUS_DISCIPLINE_SUBTYPE_WEIGHTS = {
  notableFigure: 1,
  fictional: 1,
  proverb: 1,
}

// funFact's 2 equally-likely presentations: a plain fact, or the
// interactive "Guess It" question-then-reveal-answer variant.
export const FUN_FACT_SUBTYPE_WEIGHTS = {
  fact: 1,
  guessIt: 1,
}

// personalStatCard draws from the user's own real data — see
// computeStatValue below. Not placeholder content: these are real numbers,
// just picked from a small fixed set of templates for variety. (No "current
// streak" template yet — there is no streak-tracking feature built anywhere
// in this app yet; add one here once that data actually exists.)
const STAT_TEMPLATE_KINDS = ['today', 'week', 'allTime', 'tasksDone']

function computeStatValue(kind, { ticks, activityLog }) {
  switch (kind) {
    case 'today':
      return countTicksInDates(ticks, 'pomodoro', [todayString()])
    case 'week':
      return countTicksInDates(ticks, 'pomodoro', datesForThisWeek())
    case 'allTime':
      return ticks.filter((t) => t.type === 'pomodoro').length
    case 'tasksDone':
      return activityLog.length
    default:
      return 0
  }
}

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// Weighted random pick from a { key: weight } object — every weight above is
// a plain positive number, not a probability, so this normalizes by the sum
// rather than assuming they add to 1 (makes rebalancing a single-line edit).
function weightedRandom(weights) {
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = Math.random() * total
  for (const [key, w] of entries) {
    if (roll < w) return key
    roll -= w
  }
  return entries[entries.length - 1][0]
}

// Rolls one full card draw: Rare pre-empts the category roll entirely; then
// a category, then (where applicable) a sub-type, then the actual content.
// `t` is the translate function (from useTranslation()/usePomodoro's own
// bridge pattern) — placeholder content lives in en.js/tr.js under
// motivation.categories.*, same "array of entries, pick one" shape the
// original 3-category version used. `ticks`/`activityLog` are only read for
// personalStatCard; pass loadTicks()/loadActivityLog()'s results (or []).
//
// Returns { category, subType, isRare, content }, where content is either
// { type: 'text', text } or { type: 'guessIt', question, answer } — the only
// two presentation shapes MotivationOverlay's reveal panel needs to handle.
export function drawCard({ t, ticks = [], activityLog = [] }) {
  if (Math.random() < RARE_CARD_CHANCE) {
    return {
      category: RARE_CATEGORY_ID,
      subType: null,
      isRare: true,
      content: { type: 'text', text: t('motivation.categories.rare.openingLine') },
    }
  }

  const category = weightedRandom(CATEGORY_WEIGHTS)

  if (category === 'focusDiscipline') {
    const subType = weightedRandom(FOCUS_DISCIPLINE_SUBTYPE_WEIGHTS)
    const entries = t(`motivation.categories.focusDiscipline.subTypes.${subType}.entries`)
    return { category, subType, isRare: false, content: { type: 'text', text: pickRandom(entries) } }
  }

  if (category === 'funFact') {
    const subType = weightedRandom(FUN_FACT_SUBTYPE_WEIGHTS)
    if (subType === 'guessIt') {
      const entries = t('motivation.categories.funFact.subTypes.guessIt.entries')
      const entry = pickRandom(entries)
      return {
        category,
        subType,
        isRare: false,
        content: { type: 'guessIt', question: entry.question, answer: entry.answer },
      }
    }
    const entries = t('motivation.categories.funFact.subTypes.fact.entries')
    return { category, subType, isRare: false, content: { type: 'text', text: pickRandom(entries) } }
  }

  if (category === 'personalStatCard') {
    const kind = pickRandom(STAT_TEMPLATE_KINDS)
    const value = computeStatValue(kind, { ticks, activityLog })
    const text = t(`motivation.categories.personalStatCard.templates.${kind}`, { count: value })
    return { category, subType: null, isRare: false, content: { type: 'text', text } }
  }

  // selfCompassion / tomatoManJokes — flat entries array, no sub-types.
  const entries = t(`motivation.categories.${category}.entries`)
  return { category, subType: null, isRare: false, content: { type: 'text', text: pickRandom(entries) } }
}

// Pure aggregation over storage.js's loadCardDraws() result — the basis for
// both CardCollectionStats.jsx and (later) any achievement system built on
// top of this same collection.
export function summarizeCardDraws(draws) {
  const byCategory = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0]))
  let firstRareAt = null
  for (const draw of draws) {
    if (draw.category in byCategory) byCategory[draw.category] += 1
    if (draw.isRare && draw.timestamp && (!firstRareAt || draw.timestamp < firstRareAt)) {
      firstRareAt = draw.timestamp
    }
  }
  return {
    totalDraws: draws.length,
    byCategory,
    rareCount: byCategory[RARE_CATEGORY_ID],
    firstRareAt,
    distinctCategoriesSeen: Object.values(byCategory).filter((count) => count > 0).length,
  }
}
