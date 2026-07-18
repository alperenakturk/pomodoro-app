// Selectable themes, grouped into three tiers (Dark / Light Pastel / Light
// Vivid). Each id doubles as its CSS class name (see index.css). Exactly
// one theme per tier is `recommended: true` — the picker's flagship pick
// for that tier — but this is a presentation-only concept (which swatch
// gets a badge/lead position); it does NOT change the single technical
// DEFAULT_SETTINGS.theme value, which stays 'light-terracotta' regardless.
// Light Terracotta is the actual app-wide default (DEFAULT_SETTINGS.theme in
// storage.js, and schema.sql's settings.theme column default).
export const THEMES = [
  { id: 'dark', labelKey: 'settings.themeDark', tier: 'dark', recommended: true },
  { id: 'dark-espresso', labelKey: 'settings.themeDarkEspresso', tier: 'dark', recommended: false },
  { id: 'dark-slate', labelKey: 'settings.themeDarkSlate', tier: 'dark', recommended: false },
  { id: 'light-terracotta', labelKey: 'settings.themeLightTerracotta', tier: 'light-pastel', recommended: true },
  { id: 'light-sage', labelKey: 'settings.themeLightSage', tier: 'light-pastel', recommended: false },
  { id: 'light-sand', labelKey: 'settings.themeLightSand', tier: 'light-pastel', recommended: false },
  { id: 'light-dusty-blue', labelKey: 'settings.themeLightDustyBlue', tier: 'light-pastel', recommended: false },
  { id: 'vivid-coral', labelKey: 'settings.themeVividCoral', tier: 'light-vivid', recommended: true },
  { id: 'vivid-citrus', labelKey: 'settings.themeVividCitrus', tier: 'light-vivid', recommended: false },
  { id: 'vivid-mint', labelKey: 'settings.themeVividMint', tier: 'light-vivid', recommended: false },
]

export const THEME_TIERS = [
  { id: 'dark', labelKey: 'settings.themeTierDark' },
  { id: 'light-pastel', labelKey: 'settings.themeTierLightPastel' },
  { id: 'light-vivid', labelKey: 'settings.themeTierLightVivid' },
]

// 'light' predates the multi-theme picker (back when theme was a plain
// dark/light boolean) — treat it as an alias for its closest current
// equivalent rather than silently falling back to unstyled dark. `!theme`
// (no value at all — e.g. a settings record that somehow never got
// DEFAULT_SETTINGS merged onto it) falls back to the same app-wide default
// as everywhere else, not to Dark specifically.
export function themeClassName(theme) {
  if (theme === 'light') return 'light-terracotta'
  if (!theme) return 'light-terracotta'
  return theme
}
