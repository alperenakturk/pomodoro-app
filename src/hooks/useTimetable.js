import { useState, useEffect, useCallback } from 'react'
import { loadTimetable, saveTimetable } from '../lib/storage'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function useTimetable() {
  const [blocks, setBlocks] = useState(() => loadTimetable())

  // Blocks are scoped to the day they were planned for — drop anything from
  // a previous day so yesterday's schedule doesn't linger as if it were
  // today's. Runs as an effect (not the useState initializer) so the state
  // update stays a pure side effect, not part of render.
  useEffect(() => {
    const today = todayString()
    setBlocks((prev) => {
      const kept = prev.filter((b) => b.date === today)
      return kept.length === prev.length ? prev : kept
    })
  }, [])

  useEffect(() => {
    saveTimetable(blocks)
  }, [blocks])

  const addBlock = useCallback((start, end, label) => {
    setBlocks((prev) =>
      [...prev, { id: crypto.randomUUID(), date: todayString(), start, end, label: label || '' }].sort(
        (a, b) => a.start.localeCompare(b.start)
      )
    )
  }, [])

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return { blocks, addBlock, removeBlock }
}
