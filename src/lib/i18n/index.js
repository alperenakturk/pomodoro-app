import en from './en'
import tr from './tr'

// A small hand-rolled key-value dictionary rather than a library (e.g.
// i18next): this app has two locales, no plural rules beyond the one spot
// that needs them (handled with explicit *One/*Other keys), no lazy-loading
// requirement, and no nesting/formatting features beyond simple {{var}}
// interpolation — a library would add a dependency and an abstraction layer
// for features this app doesn't use.
const DICTIONARIES = { en, tr }

export const SUPPORTED_LANGUAGES = ['en', 'tr']

export const LOCALE_TAGS = { en: 'en-US', tr: 'tr-TR' }

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined' || !navigator.language) return 'en'
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

// `settingsLanguage` is null until the user explicitly picks one in Settings
// (see storage.js's `language` field) — until then, auto-detect every time
// rather than freezing in whatever was detected on first load.
export function resolveLanguage(settingsLanguage) {
  return SUPPORTED_LANGUAGES.includes(settingsLanguage) ? settingsLanguage : detectBrowserLanguage()
}

function getByPath(dict, key) {
  return key.split('.').reduce((obj, part) => (obj == null ? undefined : obj[part]), dict)
}

function interpolate(str, vars) {
  if (!vars) return str
  return Object.entries(vars).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    str
  )
}

// Falls back to English if a key is missing from the target language's
// dictionary (kept in sync manually — both files are small enough that a
// missing-key build step isn't warranted), then to the key itself so a typo
// surfaces visibly instead of silently rendering blank.
export function translate(language, key, vars) {
  const dict = DICTIONARIES[language] ?? DICTIONARIES.en
  const template = getByPath(dict, key) ?? getByPath(DICTIONARIES.en, key) ?? key
  return interpolate(template, vars)
}

// Formats an ISO 'YYYY-MM-DD' date string per the active locale's date
// conventions. Parses the parts manually rather than `new Date(isoString)`,
// which treats a date-only ISO string as UTC midnight — in a negative-offset
// timezone that rolls back to the previous *local* day, which would show the
// wrong date for the user's own deadline/record.
export function formatDateLocalized(isoDate, localeTag) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString(localeTag, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
