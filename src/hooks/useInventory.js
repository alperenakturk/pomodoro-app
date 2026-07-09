import { useState, useEffect, useCallback } from 'react'
import { loadInventory, saveInventory } from '../lib/storage'

export function useInventory() {
  const [items, setItems] = useState(() => loadInventory())

  useEffect(() => {
    saveInventory(items)
  }, [items])

  const addItem = useCallback((text, estimate, options = {}) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        estimate: estimate || null,
        notes: options.notes || '',
        categoryIds: options.categoryIds || [],
        deadline: options.deadline || null,
        unplanned: options.unplanned || false,
        done: false,
      },
    ])
  }, [])

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const toggleDone = useCallback((id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    )
  }, [])

  const updateItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }, [])

  // Rule 5: tasks estimated at less than a full Pomodoro should be combined
  // with similar small tasks until they add up to one.
  const combineItems = useCallback((ids) => {
    setItems((prev) => {
      const idSet = new Set(ids)
      const selected = prev.filter((i) => idSet.has(i.id))
      if (selected.length < 2) return prev

      const estimateTotal = selected.reduce((sum, i) => sum + (i.estimate || 0), 0)
      const combined = {
        id: crypto.randomUUID(),
        text: selected.map((i) => i.text).join(' + '),
        estimate: estimateTotal || null,
        notes: `Combined from: ${selected.map((i) => i.text).join(', ')}`,
        categoryIds: [...new Set(selected.flatMap((i) => i.categoryIds || []))],
        deadline: null,
        unplanned: selected.some((i) => i.unplanned),
        done: false,
      }
      return [...prev.filter((i) => !idSet.has(i.id)), combined]
    })
  }, [])

  return { items, addItem, removeItem, toggleDone, updateItem, combineItems }
}
