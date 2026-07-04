import { useState, useEffect, useCallback } from 'react'
import { loadTimetable, saveTimetable } from '../lib/storage'

export function useTimetable() {
  const [blocks, setBlocks] = useState(() => loadTimetable())

  useEffect(() => {
    saveTimetable(blocks)
  }, [blocks])

  const addBlock = useCallback((start, end, label) => {
    setBlocks((prev) =>
      [...prev, { id: crypto.randomUUID(), start, end, label: label || '' }].sort((a, b) =>
        a.start.localeCompare(b.start)
      )
    )
  }, [])

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return { blocks, addBlock, removeBlock }
}
