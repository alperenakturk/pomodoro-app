import { useState, useEffect, useCallback } from 'react'
import { loadCategories, saveCategories } from '../lib/storage'
import { CATEGORY_COLORS } from '../lib/constants'

export function useCategories() {
  const [categories, setCategories] = useState(() => loadCategories())

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

  const updateCategory = useCallback((id, patch) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
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
