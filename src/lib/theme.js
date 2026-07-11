// Selectable themes: one dark (default) plus four light palettes from the
// design mockups. Each id doubles as its CSS class name (see index.css).
export const THEMES = [
  { id: 'dark', labelKey: 'settings.themeDark' },
  { id: 'light-terracotta', labelKey: 'settings.themeLightTerracotta' },
  { id: 'light-sage', labelKey: 'settings.themeLightSage' },
  { id: 'light-sand', labelKey: 'settings.themeLightSand' },
  { id: 'light-dusty-blue', labelKey: 'settings.themeLightDustyBlue' },
]

// 'light' predates the multi-theme picker (back when theme was a plain
// dark/light boolean) — treat it as an alias for its closest current
// equivalent rather than silently falling back to unstyled dark.
export function themeClassName(theme) {
  if (theme === 'light') return 'light-terracotta'
  if (!theme) return 'dark'
  return theme
}
