import { useState, useEffect, useCallback } from 'react'
import { loadCategories, saveCategories, loadSettings, patchSettings, stampUpdated } from '../lib/storage'
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

// `deferSeeding`, when true, skips the auto-seed on mount even for an
// otherwise-eligible (empty, never-seeded) account — see seedIfNeeded below.
// Used only for a brand-new signed-in account going through AccountSetupFlow
// (App.jsx passes isNewAccount here): useCategories() is called, and this
// lazy initializer runs, on AppInner's very first render — the same render
// that first paints AccountSetupFlow, before the user has had any chance to
// act on its own 'language' step. Seeding immediately there means
// seedDefaultCategories()'s resolveLanguage(loadSettings().language) call
// only ever sees whatever the browser auto-detected (settings.language is
// still null at that point for a true new account), never whatever the user
// is about to explicitly pick a few clicks later — so an account whose
// browser locale is English but who picks Turkish in setup still got English
// starter categories. Guests and returning accounts (deferSeeding false, the
// default) have no such wizard in the way, so they keep seeding immediately
// exactly as before.
export function useCategories(deferSeeding = false) {
  const [categories, setCategories] = useState(() => {
    const loaded = loadCategories()
    if (loaded.length > 0 || loadSettings().defaultCategoriesSeeded || deferSeeding) return loaded
    patchSettings({ defaultCategoriesSeeded: true })
    return seedDefaultCategories()
  })

  // Called from AccountSetupFlow's onFinish (App.jsx) — the deterministic
  // point where the language step has already resolved, whether the user
  // explicitly picked one (setLanguage already persisted it via
  // patchSettings before this fires) or skipped it (settings.language is
  // still null, same auto-detect fallback a guest would get). No-ops for
  // every caller that doesn't need it (deferSeeding was false, or seeding
  // already happened) via the same eligibility check the initializer above
  // uses, so it's safe to call unconditionally on every AccountSetupFlow
  // finish without re-checking isNewAccount itself.
  const seedIfNeeded = useCallback(() => {
    if (loadCategories().length > 0 || loadSettings().defaultCategoriesSeeded) return
    patchSettings({ defaultCategoriesSeeded: true })
    setCategories(seedDefaultCategories())
  }, [])

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
  // stampUpdated (only on the matched category — every other category passes
  // through map() untouched) is what lets remoteProvider.js's set() tell this
  // one row actually changed without having to re-upsert (and re-stamp
  // updated_at on) the rest of the collection — see storage.js's
  // stampUpdated comment and OPTIMIZATIONS.md finding #3.
  const updateCategory = useCallback((id, patch) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? stampUpdated({ ...c, ...patch, isDefault: false }) : c)))
  }, [])

  // Deliberately no cascade delete — tasks/records referencing this id just
  // fail to resolve it afterward and fall back to "no category" wherever
  // they're displayed, the same graceful handling already needed for
  // pre-existing/legacy data that never had a valid categoryId.
  const removeCategory = useCallback((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { categories, addCategory, updateCategory, removeCategory, seedIfNeeded }
}
