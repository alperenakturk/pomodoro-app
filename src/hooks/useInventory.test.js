import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInventory } from './useInventory'

beforeEach(() => {
  localStorage.clear()
})

describe('useInventory', () => {
  it('adds an item with sensible defaults', () => {
    const { result } = renderHook(() => useInventory())
    act(() => result.current.addItem('Write report', 2))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      text: 'Write report',
      estimate: 2,
      done: false,
      unplanned: false,
    })
  })

  it('defaults categoryIds to an empty array, and accepts multiple via options', () => {
    const { result } = renderHook(() => useInventory())
    act(() => result.current.addItem('Write report', 2))
    expect(result.current.items[0].categoryIds).toEqual([])

    act(() => result.current.addItem('Fix bug', 1, { categoryIds: ['cat1', 'cat2'] }))
    expect(result.current.items[1].categoryIds).toEqual(['cat1', 'cat2'])
  })

  it('removes and updates items', () => {
    const { result } = renderHook(() => useInventory())
    act(() => result.current.addItem('Task A', 1))
    const id = result.current.items[0].id

    act(() => result.current.updateItem(id, { text: 'Task A (renamed)' }))
    expect(result.current.items[0].text).toBe('Task A (renamed)')

    act(() => result.current.removeItem(id))
    expect(result.current.items).toHaveLength(0)
  })

  it('toggles the done flag', () => {
    const { result } = renderHook(() => useInventory())
    act(() => result.current.addItem('Task A', 1))
    const id = result.current.items[0].id

    act(() => result.current.toggleDone(id))
    expect(result.current.items[0].done).toBe(true)
    act(() => result.current.toggleDone(id))
    expect(result.current.items[0].done).toBe(false)
  })

  // Rule 5: small tasks combine into one, summing their estimates.
  describe('combineItems', () => {
    it('merges 2+ selected items into one, summing estimates', () => {
      const { result } = renderHook(() => useInventory())
      act(() => {
        result.current.addItem('Reply to emails', 1)
        result.current.addItem('Clean up Slack', null)
        result.current.addItem('Unrelated big task', 5)
      })
      const [a, b] = result.current.items

      act(() => result.current.combineItems([a.id, b.id]))

      expect(result.current.items).toHaveLength(2)
      const combined = result.current.items.find((i) => i.text.includes('+'))
      expect(combined.text).toBe('Reply to emails + Clean up Slack')
      expect(combined.estimate).toBe(1)
      expect(result.current.items.some((i) => i.text === 'Unrelated big task')).toBe(true)
    })

    it('does nothing when fewer than 2 ids are given', () => {
      const { result } = renderHook(() => useInventory())
      act(() => result.current.addItem('Solo task', 1))
      const id = result.current.items[0].id

      act(() => result.current.combineItems([id]))
      expect(result.current.items).toHaveLength(1)
    })

    it('unions categoryIds from the combined items, without duplicates', () => {
      const { result } = renderHook(() => useInventory())
      act(() => {
        result.current.addItem('Reply to emails', 1, { categoryIds: ['cat1'] })
        result.current.addItem('Clean up Slack', null, { categoryIds: ['cat1', 'cat2'] })
      })
      const [a, b] = result.current.items

      act(() => result.current.combineItems([a.id, b.id]))

      const combined = result.current.items.find((i) => i.text.includes('+'))
      expect(combined.categoryIds).toEqual(['cat1', 'cat2'])
    })
  })
})
