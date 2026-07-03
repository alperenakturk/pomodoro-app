import { useState, useEffect, useCallback } from 'react'
import { loadTodayTasks, saveTodayTasks, addActivityRecord } from '../lib/storage'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

export function useTodayTasks() {
  const [tasks, setTasks] = useState(() => loadTodayTasks())
  const [activeTaskId, setActiveTaskId] = useState(null)

  useEffect(() => {
    saveTodayTasks(tasks)
  }, [tasks])

  const addTask = useCallback((text, estimate, options = {}) => {
    const task = {
      id: crypto.randomUUID(),
      text,
      estimate: estimate || null,
      realized: 0,
      internal: 0,
      external: 0,
      unplanned: options.unplanned || false,
      done: false,
      inventoryId: options.inventoryId || null,
    }
    setTasks((prev) => [...prev, task])
    return task.id
  }, [])

  const removeTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setActiveTaskId((cur) => (cur === id ? null : cur))
  }, [])

  const incrementRealized = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, realized: t.realized + 1 } : t))
    )
  }, [])

  const addInterruption = useCallback((id, kind) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        return kind === 'internal'
          ? { ...t, internal: t.internal + 1 }
          : { ...t, external: t.external + 1 }
      })
    )
  }, [])

  // Görev bitince Kayıtlar'a Tahmin/Gerçek/Fark satırı ekleniyor.
  const finishTask = useCallback((id) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id)
      if (task) {
        // Tahmin girilmediyse fark hesaplanamaz — sahte bir 0 yerine null yazılır.
        const diff = task.estimate != null ? task.realized - task.estimate : null
        addActivityRecord({
          id: crypto.randomUUID(),
          date: todayString(),
          time: nowTime(),
          activity: task.text,
          estimate: task.estimate,
          real: task.realized,
          diff,
          internal: task.internal,
          external: task.external,
          unplanned: task.unplanned,
        })
      }
      return prev.map((t) => (t.id === id ? { ...t, done: true } : t))
    })
    setActiveTaskId((cur) => (cur === id ? null : cur))
  }, [])

  return {
    tasks,
    activeTaskId,
    setActiveTaskId,
    addTask,
    removeTask,
    incrementRealized,
    addInterruption,
    finishTask,
  }
}
