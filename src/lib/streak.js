import { todayString } from './reportsMath'

// Placeholder thresholds — tunable later without touching any of the logic
// below, same "named constant, not a magic number" reasoning as
// reportsMath.js's PERIOD_WINDOW_DAYS. The very first one is 1 day on
// purpose: a brand new user should get a real celebration (not just a small
// increment pop) the first time they complete a Pomodoro at all — instant
// positive feedback, not a multi-day wait before the feature shows itself.
export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 50, 100, 200, 365]

// How often a new Streak Freeze is granted, in days.
const FREEZE_GRANT_INTERVAL_DAYS = 7

// Deliberately formats back via local getters, not toISOString().slice(0,10)
// — the latter converts to UTC first, which silently shifts the date by a
// day whenever the local timezone offset crosses midnight (anywhere outside
// UTC+0, essentially always). d itself was already constructed and mutated
// in local time via setDate/getDate, so it must be read back the same way.
function addDays(dateString, delta) {
  const d = new Date(`${dateString}T00:00:00`)
  d.setDate(d.getDate() + delta)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysBetween(fromDateString, toDateString) {
  const from = new Date(`${fromDateString}T00:00:00`)
  const to = new Date(`${toDateString}T00:00:00`)
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

function datesWithPomodoro(ticks) {
  return new Set(ticks.filter((t) => t.type === 'pomodoro').map((t) => t.date))
}

// Walks backward day-by-day from `today`. A day with a Pomodoro increments
// the count; a day present in `freezeUsedDates` (a missed day a Streak
// Freeze already covered) is a pass-through — it keeps the chain alive
// without adding to the count, exactly how Duolingo's freeze behaves. Stops
// at the first day that's neither. Today not having a Pomodoro yet isn't a
// break (the day isn't over) — that just means counting starts from
// yesterday instead.
export function currentStreak(ticks, freezeUsedDates = [], today = todayString()) {
  const kept = datesWithPomodoro(ticks)
  const frozen = new Set(freezeUsedDates)
  let count = 0
  let cursor = kept.has(today) ? today : addDays(today, -1)
  while (kept.has(cursor) || frozen.has(cursor)) {
    if (kept.has(cursor)) count++
    cursor = addDays(cursor, -1)
  }
  return count
}

// Same kept-vs-frozen rule as currentStreak, scanned across the entire
// history instead of walking back from today — the longest run of
// consecutive calendar dates where every date is either kept or frozen,
// counting only kept dates toward the run's length. This is also what
// STREAK_MILESTONES checks against — a milestone once reached stays reached
// even after the current streak later resets, with no separate "milestones
// seen" field to keep in sync.
export function longestStreak(ticks, freezeUsedDates = []) {
  const kept = datesWithPomodoro(ticks)
  const frozen = new Set(freezeUsedDates)
  const allDates = [...new Set([...kept, ...frozen])].sort()
  if (allDates.length === 0) return 0

  let longest = 0
  let current = 0
  let previousDate = null
  for (const date of allDates) {
    if (previousDate !== null && addDays(previousDate, 1) !== date) {
      longest = Math.max(longest, current)
      current = 0
    }
    if (kept.has(date)) current++
    previousDate = date
  }
  return Math.max(longest, current)
}

// Highest milestone <= streak, or null if the streak hasn't reached the
// first one yet.
export function highestMilestoneReached(streak) {
  let reached = null
  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone) reached = milestone
  }
  return reached
}

// First milestone > streak, or null once every milestone has been passed.
export function nextMilestone(streak) {
  return STREAK_MILESTONES.find((milestone) => milestone > streak) ?? null
}

// Day-by-day status for the last `days` calendar days ending today — the
// basis for StreakDetailsModal's recent-days strip. Today gets 'pending'
// (not 'missed') when it has no Pomodoro yet, same "today isn't a break
// until it's over" reasoning as currentStreak above.
export function recentDayStatuses(ticks, freezeUsedDates = [], today = todayString(), days = 14) {
  const kept = datesWithPomodoro(ticks)
  const frozen = new Set(freezeUsedDates)
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    let status
    if (kept.has(date)) status = 'done'
    else if (frozen.has(date)) status = 'frozen'
    else if (date === today) status = 'pending'
    else status = 'missed'
    result.push({ date, status })
  }
  return result
}

// Checked once per app load. A Streak Freeze only ever protects *yesterday*
// — it never retroactively repairs an older gap, same as real Duolingo
// behavior: if the user has been away for several days, only the single day
// immediately before today could still be "in time" to save today's
// continuation. Returns a settings patch (streakFreezeAvailable: false,
// streakFreezeUsedDates: [...,yesterday]) if a freeze should be spent, or
// null if nothing needs to change (already handled, no freeze available, or
// there was no streak to protect in the first place). Safe to call on every
// load — re-running it after yesterday is already in streakFreezeUsedDates
// is a no-op.
export function reconcileStreakFreeze(
  { streakFreezeAvailable, streakFreezeUsedDates = [] },
  ticks,
  today = todayString()
) {
  const yesterday = addDays(today, -1)
  const kept = datesWithPomodoro(ticks)
  if (kept.has(yesterday) || streakFreezeUsedDates.includes(yesterday)) return null
  if (!streakFreezeAvailable) return null

  const streakBeforeGap = currentStreak(ticks, streakFreezeUsedDates, addDays(yesterday, -1))
  if (streakBeforeGap === 0) return null

  return {
    streakFreezeAvailable: false,
    streakFreezeUsedDates: [...streakFreezeUsedDates, yesterday],
  }
}

// Checked once per app load, independently of reconcileStreakFreeze above.
// `streakFreezeGrantedAt: null` (a brand new account) bootstraps straight to
// "eligible now" rather than waiting a full interval for its first freeze.
// Returns a settings patch or null.
export function maybeGrantStreakFreeze(
  { streakFreezeAvailable, streakFreezeGrantedAt },
  today = todayString()
) {
  if (streakFreezeAvailable) return null
  if (streakFreezeGrantedAt != null && daysBetween(streakFreezeGrantedAt, today) < FREEZE_GRANT_INTERVAL_DAYS) {
    return null
  }
  return { streakFreezeAvailable: true, streakFreezeGrantedAt: today }
}
