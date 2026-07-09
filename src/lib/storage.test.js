import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  subscribeToChanges,
  loadTodayTasks,
  loadActivityLog,
  loadInventory,
  loadTicks,
  loadTimetable,
  loadTimerState,
  loadSettings,
  saveInventory,
  saveTodayTasks,
  saveActivityLog,
  saveTicks,
  saveTimetable,
  saveTimerState,
  patchSettings,
  clearInventory,
  clearTodayTasks,
  clearActivityLog,
  clearTicks,
  clearTimerState,
  resetAllData,
} from './storage'

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

describe('Danger Zone: category clears', () => {
  function seedEverything() {
    saveInventory([{ id: 'i1', text: 'inv' }])
    saveTodayTasks([{ id: 't1', text: 'today' }])
    saveActivityLog([{ id: 'r1', date: '2026-01-01', activity: 'record' }])
    saveTicks([{ id: 'k1', type: 'pomodoro', date: '2026-01-01' }])
    saveTimetable([{ id: 'b1', date: '2026-01-01', start: '09:00', end: '10:00' }])
    saveTimerState({ sessionType: 'work', secondsLeft: 100, isRunning: true })
    patchSettings({ cycleLength: 6, theme: 'light', chimeStyle: 'soft' })
  }

  it('clearInventory removes only the Inventory, leaving everything else (incl. Settings) intact', () => {
    seedEverything()
    clearInventory()

    expect(loadInventory()).toEqual([])
    expect(loadTodayTasks()).toHaveLength(1)
    expect(loadActivityLog()).toHaveLength(1)
    expect(loadTicks()).toHaveLength(1)
    expect(loadTimetable()).toHaveLength(1)
    expect(loadTimerState()).not.toBeNull()
    expect(loadSettings()).toMatchObject({ cycleLength: 6, theme: 'light', chimeStyle: 'soft' })
  })

  it('clearTodayTasks removes both Today\'s Tasks and Timetable, leaving everything else intact', () => {
    seedEverything()
    clearTodayTasks()

    expect(loadTodayTasks()).toEqual([])
    expect(loadTimetable()).toEqual([])
    expect(loadInventory()).toHaveLength(1)
    expect(loadActivityLog()).toHaveLength(1)
    expect(loadTicks()).toHaveLength(1)
    expect(loadTimerState()).not.toBeNull()
    expect(loadSettings()).toMatchObject({ cycleLength: 6 })
  })

  it('clearActivityLog removes only Records, leaving everything else (incl. Settings) intact', () => {
    seedEverything()
    clearActivityLog()

    expect(loadActivityLog()).toEqual([])
    expect(loadInventory()).toHaveLength(1)
    expect(loadTodayTasks()).toHaveLength(1)
    expect(loadTicks()).toHaveLength(1)
    expect(loadTimetable()).toHaveLength(1)
    expect(loadSettings()).toMatchObject({ cycleLength: 6 })
  })

  it('clearTicks removes only interruption/pomodoro ticks, leaving everything else (incl. Settings) intact', () => {
    seedEverything()
    clearTicks()

    expect(loadTicks()).toEqual([])
    expect(loadInventory()).toHaveLength(1)
    expect(loadTodayTasks()).toHaveLength(1)
    expect(loadActivityLog()).toHaveLength(1)
    expect(loadTimetable()).toHaveLength(1)
    expect(loadSettings()).toMatchObject({ cycleLength: 6 })
  })

  it('clearTimerState removes only the saved timer state, leaving everything else (incl. Settings) intact', () => {
    seedEverything()
    clearTimerState()

    expect(loadTimerState()).toBeNull()
    expect(loadInventory()).toHaveLength(1)
    expect(loadTodayTasks()).toHaveLength(1)
    expect(loadActivityLog()).toHaveLength(1)
    expect(loadTicks()).toHaveLength(1)
    expect(loadSettings()).toMatchObject({ cycleLength: 6 })
  })

  it('resetAllData removes every key, including Settings (the one case where settings are wiped)', () => {
    seedEverything()
    resetAllData()

    expect(loadInventory()).toEqual([])
    expect(loadTodayTasks()).toEqual([])
    expect(loadActivityLog()).toEqual([])
    expect(loadTicks()).toEqual([])
    expect(loadTimetable()).toEqual([])
    expect(loadTimerState()).toBeNull()
    // loadSettings() always merges defaults back in, so the honest check is
    // that the underlying key is gone, not that loadSettings() returns {}.
    expect(localStorage.getItem('pomodoro_settings')).toBeNull()
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
