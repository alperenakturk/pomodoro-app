import { useState, useCallback, useMemo, useEffect } from 'react'
import { loadSettings, patchSettings } from '../storage'
import { resolveLanguage, translate, LOCALE_TAGS } from './index'
import { LanguageContext } from './context'

// A Context, unlike most state in this app (which App.jsx owns and prop-
// drills down, see CLAUDE.md's Component wiring section) — translation
// strings are needed by nearly every leaf component (category tag chips,
// row buttons, list items several levels deep), so prop-drilling `t` through
// every intermediate component would be pure boilerplate. Theme/categories
// stay prop-drilled since only a handful of top-level components need them.
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => resolveLanguage(loadSettings().language))

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    patchSettings({ language: lang })
  }, [])

  const t = useCallback((key, vars) => translate(language, key, vars), [language])

  const value = useMemo(
    () => ({ language, setLanguage, t, localeTag: LOCALE_TAGS[language] }),
    [language, setLanguage, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
