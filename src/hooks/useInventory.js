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

  return { items, addItem, removeItem, toggleDone }
}
