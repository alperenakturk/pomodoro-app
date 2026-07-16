import { useEffect, useRef, useState } from 'react'
import { loadTicks, loadSettings, patchSettings, subscribeToChanges } from '../lib/storage'
import { todayString } from '../lib/reportsMath'
import {
  STREAK_MILESTONES,
  currentStreak,
  longestStreak,
  nextMilestone,
  recentDayStatuses,
  reconcileStreakFreeze,
  maybeGrantStreakFreeze,
} from '../lib/streak'

const FREEZE_GRANT_INTERVAL_DAYS = 7

// Settings changes made elsewhere in the app (theme, display name, etc.)
// never broadcast via notifyChange/subscribeToChanges — every consumer just
// keeps its own local copy and calls patchSettings() to persist (see
// App.jsx's selectTheme). This hook is the only writer of the three
// streakFreeze* fields, so it's safe to load settings once on mount and
// update its own local copy directly from patchSettings()'s return value,
// same as everywhere else in this app.
export function useStreak() {
  const [ticks, setTicks] = useState(() => loadTicks())
  const [settings, setSettings] = useState(() => loadSettings())

  // Ticks DO broadcast (usePomodoro.js's addTick calls notifyChange) —
  // that's the actual trigger for a streak changing while this hook is
  // mounted, same reactive pattern Reports.jsx already uses.
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => setTicks(loadTicks()))
    return unsubscribe
  }, [])

  // Reconciles a missed-yesterday freeze spend, then a weekly freeze grant —
  // both pure/idempotent (see streak.js), so re-running this whenever ticks
  // or settings change is safe; a settled state always returns null from
  // both and patches nothing further.
  useEffect(() => {
    const freezePatch = reconcileStreakFreeze(settings, ticks)
    if (freezePatch) {
      setSettings(patchSettings(freezePatch))
      return
    }
    const grantPatch = maybeGrantStreakFreeze(settings)
    if (grantPatch) {
      setSettings(patchSettings(grantPatch))
    }
  }, [ticks, settings])

  const today = todayString()
  const streak = currentStreak(ticks, settings.streakFreezeUsedDates, today)
  const longest = longestStreak(ticks, settings.streakFreezeUsedDates)
  const todayDone = ticks.some((t) => t.type === 'pomodoro' && t.date === today)

  const daysUntilNextFreeze = settings.streakFreezeAvailable
    ? 0
    : settings.streakFreezeGrantedAt == null
      ? 0
      : Math.max(
          0,
          FREEZE_GRANT_INTERVAL_DAYS -
            Math.round((new Date(today) - new Date(settings.streakFreezeGrantedAt)) / (24 * 60 * 60 * 1000))
        )

  // One-shot celebration signal: fires only on an actual increase in streak
  // while mounted (never on mount itself, since the ref's initial value is
  // whatever the streak already was at first render) — same
  // ref-compares-previous-value pattern as usePomodoro.js's
  // completionPulseKey/Timer.jsx's prevPulseKeyRef.
  const prevStreakRef = useRef(streak)
  const [celebration, setCelebration] = useState(null) // null | 'increment' | 'milestone'
  useEffect(() => {
    if (streak > prevStreakRef.current) {
      setCelebration(STREAK_MILESTONES.includes(streak) ? 'milestone' : 'increment')
    }
    prevStreakRef.current = streak
  }, [streak])

  function clearCelebration() {
    setCelebration(null)
  }

  return {
    currentStreak: streak,
    longestStreak: longest,
    todayDone,
    freezeAvailable: settings.streakFreezeAvailable,
    daysUntilNextFreeze,
    nextMilestone: nextMilestone(streak),
    recentDays: recentDayStatuses(ticks, settings.streakFreezeUsedDates, today, 14),
    celebration,
    clearCelebration,
  }
}
