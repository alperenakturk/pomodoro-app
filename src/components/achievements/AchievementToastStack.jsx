import AchievementUnlockToast from './AchievementUnlockToast'

// Renders at most one toast at a time from the queue — the literal
// implementation of "queue simultaneous unlocks so they don't overlap"
// (several achievements can unlock from a single Pomodoro completing, see
// useAchievements.js). `key` forces a clean remount per achievement so each
// toast's own hold/exit timers always start fresh, never inherited from
// whatever was showing before it.
function AchievementToastStack({ toastQueue, onDismiss }) {
  if (toastQueue.length === 0) return null
  const achievement = toastQueue[0]
  return <AchievementUnlockToast key={achievement.id} achievement={achievement} onDone={onDismiss} />
}

export default AchievementToastStack
