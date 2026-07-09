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
      // Lightweight pair/team pomodoro support: no real-time sync (this app
      // has no backend), just a note of who else this task is being worked
      // with, carried through to the Records log for history.
      pairWith: options.pairWith || '',
      unplanned: options.unplanned || false,
      // urgent: bugünün listesinde Unplanned & Urgent bölümünde mi gösterilecek.
      // unplanned yalnızca "bu görev bugün, plan dışı ortaya çıktı" bilgisini taşır —
      // ikisi kavramsal olarak ayrı (methodology.md'deki Today Tasks şemasına bkz).
      urgent: options.urgent || false,
      done: false,
      inventoryId: options.inventoryId || null,
      // Re-estimates when a task runs long — Diff I / Diff II track successive
      // estimation errors against the real count, distinct from the original diff.
      reestimate1: null,
      reestimate2: null,
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

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  // Takes the new value directly (collected by an inline form in TaskRow)
  // rather than prompting itself, so this stays a pure updater.
  // Only two re-estimates are tracked (reestimate1/reestimate2, matching the
  // Diff I / Diff II fields) — once both are set, a third call is rejected
  // instead of silently overwriting reestimate2. Returns false when rejected
  // so the caller (TaskRow) can warn the user.
  const reestimateTask = useCallback((id, value) => {
    if (!Number.isFinite(value) || value <= 0) return false
    const task = tasks.find((t) => t.id === id)
    if (task && task.reestimate1 != null && task.reestimate2 != null) return false
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const slot = t.reestimate1 == null ? 'reestimate1' : 'reestimate2'
        return { ...t, [slot]: value }
      })
    )
    return true
  }, [tasks])

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
      const diffI = task.reestimate1 != null ? task.realized - task.reestimate1 : null
      const diffII = task.reestimate2 != null ? task.realized - task.reestimate2 : null
      addActivityRecord({
        id: crypto.randomUUID(),
        date: todayString(),
        time: nowTime(),
        activity: task.text,
        type: task.type || '',
        pairWith: task.pairWith || '',
        estimate: task.estimate,
        reestimate1: task.reestimate1 ?? null,
        reestimate2: task.reestimate2 ?? null,
        real: task.realized,
        diff,
        diffI,
        diffII,
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
    updateTask,
    reestimateTask,
    incrementRealized,
    addInterruption,
    finishTask,
  }
}
