import { useEffect, useState } from 'react'
import {
  loadTicks,
  loadActivityLog,
  loadCardDraws,
  loadVoidLog,
  loadSettings,
  loadAchievementUnlocks,
  addAchievementUnlocks,
  subscribeToChanges,
} from '../lib/storage'
import { ACHIEVEMENT_DEFINITIONS, buildAchievementSnapshot, evaluateAchievements, getCategoryProgress } from '../lib/achievements'
import { playAchievementUnlock } from '../lib/alert'

const DEFINITIONS_BY_ID = new Map(ACHIEVEMENT_DEFINITIONS.map((d) => [d.id, d]))

function loadCollections() {
  return {
    ticks: loadTicks(),
    activityLog: loadActivityLog(),
    cardDraws: loadCardDraws(),
    voidLog: loadVoidLog(),
    settings: loadSettings(),
  }
}

// Mirrors useStreak.js's shape: load once, re-load on any storage.js write
// via subscribeToChanges (pomodoro completion, break completion, task
// completion, card draw, and reflective void all already call notifyChange
// through their own addTick/addActivityRecord/addCardDraw/addVoidLogEntry —
// no new callback wiring needed anywhere else in the app), diff against what
// was already persisted, and persist + queue whatever's newly satisfied.
//
// Per product decision: no special-casing for "first evaluation ever" — a
// returning user whose existing history already satisfies achievements that
// didn't exist in a prior app version plays the same full toast queue a live
// unlock would, just once, the first time this hook runs on their data.
export function useAchievements() {
  const [collections, setCollections] = useState(() => loadCollections())
  const [unlocks, setUnlocks] = useState(() => loadAchievementUnlocks())
  const [toastQueue, setToastQueue] = useState([])

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => setCollections(loadCollections()))
    return unsubscribe
  }, [])

  const snapshot = buildAchievementSnapshot(collections)

  useEffect(() => {
    const unlockedIds = evaluateAchievements(snapshot)
    const persistedIds = new Set(unlocks.map((u) => u.achievementId))
    const newlyUnlockedIds = [...unlockedIds].filter((id) => !persistedIds.has(id))
    if (newlyUnlockedIds.length === 0) return

    const unlockedAt = new Date().toISOString()
    const records = newlyUnlockedIds.map((achievementId) => ({
      id: crypto.randomUUID(),
      achievementId,
      unlockedAt,
    }))
    setUnlocks(addAchievementUnlocks(records))

    const newlyUnlockedDefs = newlyUnlockedIds.map((id) => DEFINITIONS_BY_ID.get(id)).filter(Boolean)
    if (newlyUnlockedDefs.length > 0) {
      // One sound per batch, not once per achievement — a single Pomodoro
      // completing can cross several tiers at once.
      playAchievementUnlock()
      setToastQueue((queue) => [...queue, ...newlyUnlockedDefs])
    }
    // snapshot is derived fresh from `collections` every render; depending on
    // the two actual state values (collections, unlocks) below is equivalent
    // and avoids an unstable object-identity dependency. Re-running after
    // setUnlocks above (since `unlocks` is a dependency) is safe:
    // evaluateAchievements is idempotent, and the second pass finds nothing
    // newly unlocked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, unlocks])

  function dismissToast() {
    setToastQueue((queue) => queue.slice(1))
  }

  return {
    unlockedIds: evaluateAchievements(snapshot),
    unlocks,
    snapshot,
    toastQueue,
    dismissToast,
    getCategoryProgress: (categoryId) => getCategoryProgress(categoryId, snapshot),
  }
}
