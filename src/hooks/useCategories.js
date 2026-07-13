import { useState, useEffect, useCallback } from 'react'
import { loadCategories, saveCategories, loadSettings, patchSettings } from '../lib/storage'
import { CATEGORY_COLORS, DEFAULT_CATEGORY_SEEDS } from '../lib/constants'
import { resolveLanguage, translate } from '../lib/i18n'

// A brand new account/guest starts with a small, editable/deletable starter
// set instead of an empty list — `defaultCategoriesSeeded` (storage.js)
// guards this to run exactly once ever, so a user who later deletes every
// category on purpose doesn't see them silently reappear. Not a React
// component, so it reaches for the plain translate()/resolveLanguage()
// functions directly (same bridge pattern usePomodoro.js uses for its
// notification strings) rather than the LanguageContext.
function seedDefaultCategories() {
  const language = resolveLanguage(loadSettings().language)
  return DEFAULT_CATEGORY_SEEDS.map(({ labelKey, colorIndex }) => ({
    id: crypto.randomUUID(),
    name: translate(language, `defaultCategories.${labelKey}`),
    color: CATEGORY_COLORS[colorIndex].value,
    // Marks this as a reproducible starter category, not real user data —
    // storage.js's signInToRemote() excludes anything still flagged this way
    // from what it syncs to a new account (each guest install would
    // otherwise seed its own copy with a different random id, duplicating
    // the starter set on every fresh sign-in instead of the account just
    // getting its own seeded once — see signInToRemote's comment). Cleared
    // by updateCategory below the moment the user actually edits one, since
    // a renamed/recolored category is real data and should sync normally.
    isDefault: true,
  }))
}

export function useCategories() {
  const [categories, setCategories] = useState(() => {
    const loaded = loadCategories()
    if (loaded.length > 0 || loadSettings().defaultCategoriesSeeded) return loaded
    patchSettings({ defaultCategoriesSeeded: true })
    return seedDefaultCategories()
  })

  useEffect(() => {
    saveCategories(categories)
  }, [categories])

  const addCategory = useCallback((name, color) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed, color: color || CATEGORY_COLORS[0].value },
    ])
  }, [])

  // Any explicit edit clears isDefault — a renamed/recolored category is the
  // user's own data now, not a reproducible starter default (see
  // seedDefaultCategories above), so it should sync like any other category.
  const updateCategory = useCallback((id, patch) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, isDefault: false } : c)))
  }, [])

  // Deliberately no cascade delete — tasks/records referencing this id just
  // fail to resolve it afterward and fall back to "no category" wherever
  // they're displayed, the same graceful handling already needed for
  // pre-existing/legacy data that never had a valid categoryId.
  const removeCategory = useCallback((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { categories, addCategory, updateCategory, removeCategory }
}
