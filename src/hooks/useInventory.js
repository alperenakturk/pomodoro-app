import { useState, useEffect, useCallback } from 'react'
import { loadInventory, saveInventory } from '../lib/storage'

export function useInventory() {
  const [items, setItems] = useState(() => loadInventory())

  useEffect(() => {
    saveInventory(items)
  }, [items])

  const addItem = useCallback((text, estimate) => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, estimate: estimate || null },
    ])
  }, [])

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  return { items, addItem, removeItem }
}
