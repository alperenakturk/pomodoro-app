import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCategories } from './useCategories'
import { CATEGORY_COLORS } from '../lib/constants'

beforeEach(() => {
  localStorage.clear()
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
