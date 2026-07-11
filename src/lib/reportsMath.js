export function todayString() {
  return new Date().toISOString().slice(0, 10)
}

// Rolling window of `n` ISO date strings ending `offsetDays` ago (0 = today).
// e.g. datesInWindow(7, 0) is today and the 6 days before it (this week);
// datesInWindow(7, 7) is the 7 days before that (last week). Rolling windows
// (not calendar-aligned weeks/months) to keep the date math simple.
function datesInWindow(n, offsetDays = 0) {
  const dates = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - offsetDays - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function datesForYesterday() {
  return datesInWindow(1, 1)
}

export function datesForThisWeek() {
  return datesInWindow(7, 0)
}

export function datesForLastWeek() {
  return datesInWindow(7, 7)
}

export function datesForMonth() {
  return datesInWindow(30, 0)
}

export function datesForQuarter() {
  return datesInWindow(90, 0)
}

const PERIOD_WINDOW_DAYS = { today: 1, week: 7, month: 30, year: 365 }

// The top-of-page time filter (Today/Week/Month/Year) — a rolling window
// ending today, used to scope the Estimation Accuracy and Interruption
// Trends sections. Distinct from datesForThisWeek/LastWeek, which are the
// two fixed week-over-week comparisons those sections always show regardless
// of this filter.
export function datesForPeriod(period) {
  return datesInWindow(PERIOD_WINDOW_DAYS[period] ?? PERIOD_WINDOW_DAYS.week, 0)
}

// A re-estimated task's original diff is stale once it's been revised —
// judge estimation accuracy against the most recent commitment (Diff II if
// it exists, else Diff I, else the original diff).
export function effectiveDiff(record) {
  return record.diffII ?? record.diffI ?? record.diff
}

export function countTicksInDates(ticks, type, dates) {
  const dateSet = new Set(dates)
  return ticks.filter((t) => t.type === type && dateSet.has(t.date)).length
}

// Ticks record only that a Pomodoro completed (type/date/timestamp), not how
// long it actually ran — usePomodoro's workMinutes is freely adjustable, and
// a tick from before a change doesn't carry the duration that was in effect
// when it happened. This multiplies the period's completed-Pomodoro count by
// today's *current* workMinutes, the same "N pomodoros = N work sessions at
// today's length" assumption AvailablePomodoros' capacity estimate already
// makes — an approximation, not a literal historical total, but the only one
// possible without adding new per-tick tracking.
export function totalFocusMinutes(ticks, dates, workMinutes) {
  return countTicksInDates(ticks, 'pomodoro', dates) * workMinutes
}

// H:MM (methodology-neutral "hours:minutes", not a locale-specific format —
// this app has no other duration display to match).
export function formatFocusDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

export function recordsInDates(records, dates) {
  const dateSet = new Set(dates)
  return records.filter((r) => dateSet.has(r.date))
}

export function recordsWithEffectiveDiff(records) {
  return records.filter((r) => effectiveDiff(r) != null)
}

// Over/underestimation counts, using the methodology's own sign convention:
// diff > 0 -> underestimated (task took longer than planned)
// diff < 0 -> overestimated (task took less time than planned)
// Balance between the two — not minimizing either one alone — is the goal.
export function estimationBreakdown(records) {
  let overestimated = 0
  let underestimated = 0
  for (const r of records) {
    const diff = effectiveDiff(r)
    if (diff == null || diff === 0) continue
    if (diff > 0) underestimated++
    else overestimated++
  }
  return { overestimated, underestimated }
}

export function avgAbsDiff(records) {
  const withDiff = recordsWithEffectiveDiff(records)
  if (withDiff.length === 0) return null
  return withDiff.reduce((sum, r) => sum + Math.abs(effectiveDiff(r)), 0) / withDiff.length
}

// The key correction over a raw interruption total: normalize by how many
// tasks were actually finished, not just how many interruption events
// happened — a busy week with 10 tasks and 10 interruptions reads very
// differently from a light week with 2 tasks and 10 interruptions.
export function avgInterruptionsPerTask(records) {
  if (records.length === 0) return null
  const total = records.reduce((sum, r) => sum + (r.internal || 0) + (r.external || 0), 0)
  return total / records.length
}

export function trendDirection(current, previous) {
  if (current == null || previous == null) return 'flat'
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'flat'
}

// Most recent N records in append (chronological) order, newest last —
// matches how records/ticks are stored, so callers that want newest-first
// just reverse the result.
export function takeLast(records, limit) {
  return records.slice(-limit)
}

// Pomodoros completed per category, for the Reports category-breakdown
// chart. Ticks (the raw pomodoro events) don't carry a category — only a
// finished Activity Log record does — so this sums `real` per category
// across finished tasks, which only counts pomodoros from tasks that have
// actually been finished, not ones still in progress. That's a real
// limitation of the existing data model, not something fixable here without
// adding new tracking.
//
// A task can carry multiple category tags (categoryIds is an array). Its
// pomodoros count fully toward EACH assigned category — intentionally not
// split N ways — since a task tagged "Coding" + "Client Work" really did
// spend all of its pomodoros on both at once, not half on each. A record
// with no tags, or whose tags don't resolve to a real category (deleted, or
// legacy data), buckets into "Uncategorized" rather than being dropped.
export function pomodorosByCategory(records, categories, uncategorizedLabel = 'Uncategorized') {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const totals = new Map()

  function addTo(key, name, color, amount) {
    const existing = totals.get(key)
    if (existing) {
      existing.total += amount
    } else {
      totals.set(key, { id: key, name, color, total: amount })
    }
  }

  for (const r of records) {
    const resolvedCategories = (r.categoryIds ?? []).map((id) => byId.get(id)).filter(Boolean)
    if (resolvedCategories.length === 0) {
      addTo('uncategorized', uncategorizedLabel, null, r.real || 0)
    } else {
      for (const category of resolvedCategories) {
        addTo(category.id, category.name, category.color, r.real || 0)
      }
    }
  }

  return [...totals.values()]
    .filter((bucket) => bucket.total > 0)
    .sort((a, b) => b.total - a.total)
}

// True once there's at least one tick/record, but every single one of them
// is dated today — i.e. no historical data exists yet, so the Today/Week/
// Month/Year filters are all aggregating the exact same one day and can
// never show a different result. Distinct from "no data at all" (which the
// existing empty states already explain on their own).
export function hasNoHistoryYet(ticks, records) {
  const today = todayString()
  const allDates = [...ticks.map((t) => t.date), ...records.map((r) => r.date)]
  return allDates.length > 0 && allDates.every((d) => d === today)
}
