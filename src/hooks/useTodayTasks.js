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
      type: options.type || '',
      unplanned: options.unplanned || false,
      // urgent: bugünün listesinde Unplanned & Urgent bölümünde mi gösterilecek.
      // unplanned yalnızca "bu görev bugün, plan dışı ortaya çıktı" bilgisini taşır —
      // ikisi kavramsal olarak ayrı (methodology.md'deki Today Tasks şemasına bkz).
      urgent: options.urgent || false,
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

  const addInterruption = useCallback((id, kind, delta = 1) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const key = kind === 'internal' ? 'internal' : 'external'
        return { ...t, [key]: Math.max(0, t[key] + delta) }
      })
    )
  }, [])

  // Görev bitince Kayıtlar'a Tahmin/Gerçek/Fark satırı ekleniyor.
  // addActivityRecord bilerek setTasks'in updater'ının DIŞINDA çağrılıyor —
  // updater'lar saf olmalı; StrictMode onları geliştirmede 2 kez çalıştırıp
  // bu yan etkiyi (localStorage yazımını) tekrarlayabilir.
  const finishTask = useCallback((id) => {
    const task = tasks.find((t) => t.id === id)
    if (task) {
      // Tahmin girilmediyse fark hesaplanamaz — sahte bir 0 yerine null yazılır.
      const diff = task.estimate != null ? task.realized - task.estimate : null
      addActivityRecord({
        id: crypto.randomUUID(),
        date: todayString(),
        time: nowTime(),
        activity: task.text,
        type: task.type || '',
        estimate: task.estimate,
        real: task.realized,
        diff,
        internal: task.internal,
        external: task.external,
        unplanned: task.unplanned,
      })
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)))
    setActiveTaskId((cur) => (cur === id ? null : cur))
  }, [tasks])

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
