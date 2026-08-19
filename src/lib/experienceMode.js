// Central, declarative registry of every UI surface hidden in Simple mode —
// same "derive, don't scatter conditionals" philosophy as achievements.js.
// Nothing here holds achievement-specific gating (see that file's own
// `requiresMode` field) or any persisted data of its own; this is purely a
// lookup table plus the one function that resolves "which mode is this
// session actually in," which every caller must go through rather than
// reading settings.experienceMode directly.

export const EXPERIENCE_MODES = ['simple', 'full']

// Feature ids used as keys, one per gated UI surface — kept flat (not
// nested by tab) since call sites just ask "is <thing> visible", not
// "what's visible in <tab>".
export const FULL_MODE_ONLY_FEATURES = new Set([
  'reportsTab',
  'planningTimetable',
  'planningInventory',
  'voidReasonPrompt',
  'urgentTaskFlag',
  'customTheme',
  'pip',
  'interruptionInternalExternalChoice',
])

export function isFeatureVisible(mode, featureId) {
  if (!FULL_MODE_ONLY_FEATURES.has(featureId)) return true
  return mode === 'full'
}

// Single source of truth for "what mode is this session in" — guests are
// ALWAYS 'simple', no matter what settings.experienceMode holds (mirrors
// storage.js's fullscreenBackgroundPath precedent: gated in the UI layer
// only, never special-cased inside storage.js itself). Every call site
// (App.jsx, SettingsModal.jsx, Timer.jsx, AchievementGrid, coach-mark
// callers) resolves through this, never reads settings.experienceMode raw.
export function resolveExperienceMode(settings, user) {
  if (!user) return 'simple'
  return settings.experienceMode === 'simple' ? 'simple' : 'full'
}

// Whether this session is even allowed to pick 'full' — used by the header/
// Settings toggle and the AccountSetupFlow step to decide locked-vs-active
// rendering.
export function canUseFullMode(user) {
  return Boolean(user)
}
