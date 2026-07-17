// Selectable themes: Dark plus four light palettes from the design
// mockups. Each id doubles as its CSS class name (see index.css).
// Light Terracotta is the actual default (DEFAULT_SETTINGS.theme in
// storage.js, and schema.sql's settings.theme column default) — Dark isn't
// special beyond being first in this list/picker order.
export const THEMES = [
  { id: 'dark', labelKey: 'settings.themeDark' },
  { id: 'light-terracotta', labelKey: 'settings.themeLightTerracotta' },
  { id: 'light-sage', labelKey: 'settings.themeLightSage' },
  { id: 'light-sand', labelKey: 'settings.themeLightSand' },
  { id: 'light-dusty-blue', labelKey: 'settings.themeLightDustyBlue' },
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
