import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCategories } from './useCategories'
import { CATEGORY_COLORS, DEFAULT_CATEGORY_SEEDS } from '../lib/constants'

beforeEach(() => {
  localStorage.clear()
  // Everything below this line is testing add/update/remove in isolation,
  // not the one-time default-category seeding (see its own describe block)
  // — marking "already seeded" keeps these tests' starting state as a truly
  // empty list, same as before that feature existed.
  localStorage.setItem('pomodoro_settings', JSON.stringify({ defaultCategoriesSeeded: true }))
})

describe('useCategories', () => {
  it('adds a category with the given name and color', () => {
    const { result } = renderHook(() => useCategories())
    act(() => result.current.addCategory('Coding', CATEGORY_COLORS[1].value))

    expect(result.current.categories).toHaveLength(1)
    expect(result.current.categories[0]).toMatchObject({
      name: 'Coding',
      color: CATEGORY_COLORS[1].value,
    })
  })

  it('trims the name and ignores an empty/whitespace-only name', () => {
    const { result } = renderHook(() => useCategories())
    act(() => result.current.addCategory('  Writing  ', CATEGORY_COLORS[0].value))
    expect(result.current.categories[0].name).toBe('Writing')

    act(() => result.current.addCategory('   ', CATEGORY_COLORS[0].value))
    expect(result.current.categories).toHaveLength(1)
  })

  it('falls back to the first palette color when none is given', () => {
    const { result } = renderHook(() => useCategories())
    act(() => result.current.addCategory('Coding'))
    expect(result.current.categories[0].color).toBe(CATEGORY_COLORS[0].value)
  })

  it('updates and removes a category', () => {
    const { result } = renderHook(() => useCategories())
    act(() => result.current.addCategory('Coding', CATEGORY_COLORS[0].value))
    const id = result.current.categories[0].id

    act(() => result.current.updateCategory(id, { name: 'Deep Work', color: CATEGORY_COLORS[2].value }))
    expect(result.current.categories[0]).toMatchObject({ name: 'Deep Work', color: CATEGORY_COLORS[2].value })

    act(() => result.current.removeCategory(id))
    expect(result.current.categories).toHaveLength(0)
  })

  // OPTIMIZATIONS.md finding #3: updateCategory now stamps updatedAt only on
  // the edited category, leaving a sibling category's object (and its own
  // updatedAt) exactly as it was — see useInventory.test.js's identical
  // describe block for the full rationale.
  it('bumps updatedAt only on the edited category, leaving a sibling category untouched', () => {
    const { result } = renderHook(() => useCategories())
    act(() => {
      result.current.addCategory('Coding', CATEGORY_COLORS[0].value)
      result.current.addCategory('Writing', CATEGORY_COLORS[1].value)
    })
    const [coding, writing] = result.current.categories

    act(() => result.current.updateCategory(coding.id, { name: 'Deep Work' }))

    const [updatedCoding, untouchedWriting] = result.current.categories
    expect(updatedCoding.updatedAt).toEqual(expect.any(String))
    expect(untouchedWriting.updatedAt).toBe(writing.updatedAt)
    expect(untouchedWriting.name).toBe('Writing')
  })
})

describe('useCategories default seeding', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('seeds a starter set of categories for a brand new account with none yet', () => {
    const { result } = renderHook(() => useCategories())

    expect(result.current.categories).toHaveLength(DEFAULT_CATEGORY_SEEDS.length)
    expect(result.current.categories.every((c) => c.name && c.color)).toBe(true)
  })

  it('never reseeds once the flag is set, even if the user deletes every category', () => {
    const { result, unmount } = renderHook(() => useCategories())
    act(() => {
      result.current.categories.forEach((c) => result.current.removeCategory(c.id))
    })
    expect(result.current.categories).toHaveLength(0)
    unmount()

    const { result: reloaded } = renderHook(() => useCategories())
    expect(reloaded.current.categories).toHaveLength(0)
  })

  it('does not seed when the account already has its own categories', () => {
    localStorage.setItem(
      'pomodoro_categories',
      JSON.stringify([{ id: 'existing', name: 'Existing', color: CATEGORY_COLORS[0].value }])
    )
    const { result } = renderHook(() => useCategories())
    expect(result.current.categories).toHaveLength(1)
    expect(result.current.categories[0].name).toBe('Existing')
  })
})

// Regression tests for a reported bug: a brand-new signed-in account's
// starter categories were always seeded in English regardless of what
// language the user picked during AccountSetupFlow. Root cause: useCategories'
// seeding used to run unconditionally in its lazy useState initializer, which
// fires on AppInner's very first render — the exact render that first paints
// AccountSetupFlow, before the user could possibly have acted on its
// 'language' step yet. seedDefaultCategories() always resolved whatever
// language was in settings *at that instant* (null for a true new account,
// so it fell back to the browser's auto-detected language), never the
// language the user went on to explicitly choose a few clicks later. Fixed
// with a `deferSeeding` param (App.jsx passes isNewAccount) that skips the
// auto-seed on mount, plus a `seedIfNeeded()` escape hatch App.jsx calls from
// AccountSetupFlow's onFinish — the point where the language step (if
// touched) has already been persisted.
describe('useCategories deferred seeding (new-account language fix)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('does not seed on mount when deferSeeding is true', () => {
    const { result } = renderHook(() => useCategories(true))
    expect(result.current.categories).toHaveLength(0)
  })

  it('seeds using the language chosen before seedIfNeeded is called, not whatever was set at mount time', () => {
    // Nothing chosen yet at mount (a true new account's settings.language
    // starts null) -> mirrors the moment AccountSetupFlow first paints.
    const { result } = renderHook(() => useCategories(true))
    expect(result.current.categories).toHaveLength(0)

    // Simulates the user picking Turkish partway through AccountSetupFlow's
    // own 'language' step (LanguageContext's setLanguage calls exactly this).
    localStorage.setItem('pomodoro_settings', JSON.stringify({ language: 'tr' }))

    // AccountSetupFlow finishing (Continue through every step, or Skip) is
    // when App.jsx calls seedIfNeeded().
    act(() => result.current.seedIfNeeded())

    expect(result.current.categories).toHaveLength(DEFAULT_CATEGORY_SEEDS.length)
    expect(result.current.categories.map((c) => c.name)).toEqual(
      expect.arrayContaining(['İş', 'Ders', 'Kişisel', 'Yönetimsel', 'Sağlık'])
    )
  })

  it('seedIfNeeded is a no-op once seeding already happened', () => {
    const { result } = renderHook(() => useCategories(true))
    act(() => result.current.seedIfNeeded())
    expect(result.current.categories).toHaveLength(DEFAULT_CATEGORY_SEEDS.length)

    act(() => {
      result.current.categories.forEach((c) => result.current.removeCategory(c.id))
    })
    expect(result.current.categories).toHaveLength(0)

    // A second seedIfNeeded call (e.g. AccountSetupFlow somehow finishing
    // twice) must not silently bring the starter set back after the user
    // deleted it — same one-time-only guarantee as the immediate-seeding path.
    act(() => result.current.seedIfNeeded())
    expect(result.current.categories).toHaveLength(0)
  })

  it('a guest/returning account (deferSeeding false) still seeds immediately, unaffected by this fix', () => {
    const { result } = renderHook(() => useCategories(false))
    expect(result.current.categories).toHaveLength(DEFAULT_CATEGORY_SEEDS.length)
  })
})
