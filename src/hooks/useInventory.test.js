import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInventory } from './useInventory'
import { importBackup, loadInventory } from '../lib/storage'

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

  // OPTIMIZATIONS.md finding #3: editing one item used to rewrite the whole
  // collection (locally and to Supabase) without ever actually bumping the
  // edited item's own updatedAt — these two collections regression-test the
  // fix, which is what makes remoteProvider.js's set() able to tell which
  // single row changed (see its own comment) and is also what
  // mergeCollectionById (importData.js) needs to correctly prefer a local
  // edit over a stale imported copy of the same id.
  describe('updatedAt on edit (finding #3)', () => {
    it('bumps updatedAt only on the edited item, leaving sibling items untouched', () => {
      const { result } = renderHook(() => useInventory())
      act(() => {
        result.current.addItem('Task A', 1)
        result.current.addItem('Task B', 1)
      })
      const [a, b] = result.current.items
      const bUpdatedAtBefore = b.updatedAt

      act(() => result.current.updateItem(a.id, { text: 'Task A (renamed)' }))

      const [updatedA, untouchedB] = result.current.items
      expect(updatedA.updatedAt).toEqual(expect.any(String))
      expect(untouchedB.updatedAt).toBe(bUpdatedAtBefore)
      expect(untouchedB.text).toBe('Task B')
    })

    it('also bumps updatedAt for toggleDone, another single-item edit', () => {
      const { result } = renderHook(() => useInventory())
      act(() => {
        result.current.addItem('Task A', 1)
        result.current.addItem('Task B', 1)
      })
      const [a, b] = result.current.items
      const bUpdatedAtBefore = b.updatedAt

      act(() => result.current.toggleDone(a.id))

      const [toggledA, untouchedB] = result.current.items
      expect(toggledA.updatedAt).toEqual(expect.any(String))
      expect(untouchedB.updatedAt).toBe(bUpdatedAtBefore)
    })

    it('lets a locally-edited item correctly win a merge-mode import against an older backup of the same id', () => {
      const { result } = renderHook(() => useInventory())
      act(() => result.current.addItem('Task A', 1))
      const id = result.current.items[0].id

      act(() => result.current.updateItem(id, { text: 'Task A (edited locally)' }))
      const editedUpdatedAt = result.current.items[0].updatedAt
      expect(editedUpdatedAt).toEqual(expect.any(String))

      // Simulates importing an older backup (e.g. exported from another
      // device before this edit happened) that still has the pre-edit text
      // and an older updatedAt. Before finding #3's fix, this local edit's
      // updatedAt was never actually bumped (stayed null forever), so
      // mergeCollectionById had no real signal to prefer it over the stale
      // imported copy — this is the regression test for that latent bug.
      importBackup(
        { inventory: [{ id, text: 'Task A (stale import)', updatedAt: '2020-01-01T00:00:00.000Z' }] },
        'merge'
      )

      const merged = loadInventory().find((i) => i.id === id)
      expect(merged.text).toBe('Task A (edited locally)')
      expect(merged.updatedAt).toBe(editedUpdatedAt)
    })
  })
})
