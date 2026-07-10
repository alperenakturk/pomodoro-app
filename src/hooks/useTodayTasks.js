import { useState, useEffect, useCallback } from 'react'
import { loadTodayTasks, saveTodayTasks, addActivityRecord } from '../lib/storage'
import { playTaskCompleteChime } from '../lib/alert'

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
      categoryIds: options.categoryIds || [],
      notes: options.notes || '',
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

  // Backs the "Check to bottom" setting (SettingsTab) — moves a task to the
  // end of the array, which is the end of whichever of planned/urgent
  // TodoToday.jsx renders it under (filter preserves relative order), rather
  // than a global "bottom of everything." App.jsx calls this after
  // finishTask only when that setting is on; this hook itself stays
  // unaware of Settings, same as the rest of useTodayTasks.
  const moveTaskToEnd = useCallback((id) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === id)
      if (index === -1) return prev
      const next = [...prev]
      const [task] = next.splice(index, 1)
      next.push(task)
      return next
    })
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
  // Marking a task done is intentionally decoupled from the timer (usePomodoro
  // lives in a separate hook instance) — finishing a task early must not stop
  // a running Pomodoro; the remaining time is still available for overlearning.
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
        categoryIds: task.categoryIds || [],
        notes: task.notes || '',
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
      playTaskCompleteChime()
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
    moveTaskToEnd,
    reestimateTask,
    incrementRealized,
    addInterruption,
    finishTask,
  }
}
