import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscribeToChanges, loadTodayTasks, loadActivityLog } from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('load-time normalization', () => {
  it('fills in defaults for fields missing from an old-schema today-task record', () => {
    localStorage.setItem(
      'pomodoro_today_tasks',
      JSON.stringify([{ id: '1', text: 'Legacy task', estimate: 2, realized: 3, done: false }])
    )

    const [task] = loadTodayTasks()
    expect(task).toMatchObject({
      internal: 0,
      external: 0,
      pairWith: '',
      unplanned: false,
      urgent: false,
      inventoryId: null,
      reestimate1: null,
      reestimate2: null,
    })
  })

  it('fills in defaults for fields missing from an old-schema activity record', () => {
    localStorage.setItem(
      'pomodoro_activity_log',
      JSON.stringify([{ id: '1', date: '2026-01-01', activity: 'Legacy record', real: 2, diff: 0 }])
    )

    const [record] = loadActivityLog()
    expect(record).toMatchObject({
      reestimate1: null,
      reestimate2: null,
      diffI: null,
      diffII: null,
      internal: 0,
      external: 0,
      unplanned: false,
    })
  })
})

describe('cross-tab sync', () => {
  it('notifies subscribers when a native storage event fires for one of our keys', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeToChanges(callback)

    window.dispatchEvent(new StorageEvent('storage', { key: 'pomodoro_activity_log' }))

    expect(callback).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('ignores storage events for unrelated keys', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeToChanges(callback)

    window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-apps-key' }))

    expect(callback).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('notifies subscribers on localStorage.clear() (key is null)', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeToChanges(callback)

    window.dispatchEvent(new StorageEvent('storage', { key: null }))

    expect(callback).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
