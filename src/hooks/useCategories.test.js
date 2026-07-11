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
