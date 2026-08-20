// Developer Mode — a small set of dev-only conveniences (bypass the
// motivation card's draw cooldown, instantly complete the running timer,
// force a Rare card draw, preview an achievement toast or the streak
// celebration on demand, reset first-run "seen" flags) that must never be
// reachable by a real user, even in production.
//
// DEV_MODE is gated purely on import.meta.env.DEV — a Vite/Rollup build-time
// constant, not a runtime check. `vite build` (exactly what this project's
// CI runs, see .github/workflows/deploy.yml) statically replaces it with the
// literal `false`, and every branch guarded by it is dead-code-eliminated
// from the production bundle — so this can never leak, unlike an
// account-based (user.id) check, which would ship the gate itself into the
// public JS. See the "Developer Mode" plan for the full reasoning.
export const DEV_MODE = import.meta.env.DEV

// Boolean "skip this limit" gates — the same declarative-registry shape as
// experienceMode.js's FULL_MODE_ONLY_FEATURES Set + isFeatureVisible().
// Adding a new bypass to some future feature is a one-line addition here
// plus one call-site check, never more.
const DEV_BYPASSES = new Set([
  'motivationCardCooldown', // MotivationOverlay.jsx: repeat card draws
])
export function devBypassActive(id) {
  return DEV_MODE && DEV_BYPASSES.has(id)
}

// One-shot "force the next motivation-card draw to be Rare" flag. A
// module-level mutable singleton — same established pattern as storage.js's
// `activeProvider` / alert.js's `audioCtx` — rather than a prop threaded
// through App -> Timer -> MotivationOverlay: DevModePanel mounts once at
// App's root, while MotivationOverlay is a separate subtree several layers
// down that only exists while the overlay is open, so a prop would touch 3
// files for one dev-only toggle that must compile away entirely in
// production. Consumed (reset to false) the instant it's read, so it's a
// "next draw only" flag, not a sticky mode left on by accident.
let forceRareNextDraw = false
export function setForceRareNextDraw(value) {
  forceRareNextDraw = value
}
export function consumeForceRareNextDraw() {
  if (!forceRareNextDraw) return false
  forceRareNextDraw = false
  return true
}
