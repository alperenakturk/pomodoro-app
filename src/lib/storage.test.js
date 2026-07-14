import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  clearCategories,
  clearVoidLog,
  resetAllData,
  loadCategories,
  saveCategories,
  loadVoidLog,
  addVoidLogEntry,
  removeVoidLogEntry,
  addActivityRecord,
  updateActivityRecord,
  addTick,
  importBackup,
  importActivityLogCSV,
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
      categoryIds: [],
      notes: '',
      unplanned: false,
      urgent: false,
      inventoryId: null,
      reestimate1: null,
      reestimate2: null,
    })
  })

  it('drops a legacy free-text type/pairWith instead of crashing (treated as no category)', () => {
    localStorage.setItem(
      'pomodoro_today_tasks',
      JSON.stringify([
        { id: '1', text: 'Legacy task', type: 'Some old free text', pairWith: 'Alice', done: false },
      ])
    )

    const [task] = loadTodayTasks()
    expect(task.categoryIds).toEqual([])
    expect(task.pairWith).toBeUndefined()
  })

  it('wraps a legacy single categoryId into a one-element categoryIds array', () => {
    localStorage.setItem(
      'pomodoro_today_tasks',
      JSON.stringify([{ id: '1', text: 'Legacy task', categoryId: 'cat1', done: false }])
    )

    const [task] = loadTodayTasks()
    expect(task.categoryIds).toEqual(['cat1'])
  })

  it('leaves an already-migrated categoryIds array untouched', () => {
    localStorage.setItem(
      'pomodoro_today_tasks',
      JSON.stringify([{ id: '1', text: 'Task', categoryIds: ['cat1', 'cat2'], done: false }])
    )

    const [task] = loadTodayTasks()
    expect(task.categoryIds).toEqual(['cat1', 'cat2'])
  })

  it('fills in defaults for fields missing from an old-schema activity record', () => {
    localStorage.setItem(
      'pomodoro_activity_log',
      JSON.stringify([{ id: '1', date: '2026-01-01', activity: 'Legacy record', real: 2, diff: 0 }])
    )

    const [record] = loadActivityLog()
    expect(record).toMatchObject({
      categoryIds: [],
      notes: '',
      reestimate1: null,
      reestimate2: null,
      diffI: null,
      diffII: null,
      internal: 0,
      external: 0,
      unplanned: false,
    })
  })

  it('drops a legacy free-text type/pairWith on a Record instead of crashing', () => {
    localStorage.setItem(
      'pomodoro_activity_log',
      JSON.stringify([
        {
          id: '1',
          date: '2026-01-01',
          activity: 'Legacy record',
          type: 'Some old free text',
          pairWith: 'Bob',
          real: 2,
        },
      ])
    )

    const [record] = loadActivityLog()
    expect(record.categoryIds).toEqual([])
    expect(record.pairWith).toBeUndefined()
  })

  it('wraps a legacy single categoryId on a Record into a categoryIds array', () => {
    localStorage.setItem(
      'pomodoro_activity_log',
      JSON.stringify([
        { id: '1', date: '2026-01-01', activity: 'Legacy record', categoryId: 'cat1', real: 2 },
      ])
    )

    const [record] = loadActivityLog()
    expect(record.categoryIds).toEqual(['cat1'])
  })
})

describe('settings: ambientSound migration', () => {
  it('maps a legacy tickingSoundEnabled: true to ambientSound: "ticking"', () => {
    localStorage.setItem('pomodoro_settings', JSON.stringify({ tickingSoundEnabled: true }))
    expect(loadSettings().ambientSound).toBe('ticking')
  })

  it('maps a legacy tickingSoundEnabled: false to ambientSound: "none"', () => {
    localStorage.setItem('pomodoro_settings', JSON.stringify({ tickingSoundEnabled: false }))
    expect(loadSettings().ambientSound).toBe('none')
  })

  it('defaults to "none" when neither field was ever saved', () => {
    expect(loadSettings().ambientSound).toBe('none')
  })

  it('an explicit ambientSound always wins over a legacy tickingSoundEnabled', () => {
    localStorage.setItem(
      'pomodoro_settings',
      JSON.stringify({ tickingSoundEnabled: true, ambientSound: 'rain' })
    )
    expect(loadSettings().ambientSound).toBe('rain')
  })

  it('patchSettings persists ambientSound like any other setting', () => {
    patchSettings({ ambientSound: 'cafe' })
    expect(loadSettings().ambientSound).toBe('cafe')
  })
})

describe('settings: seenCoachMarks (contextual onboarding)', () => {
  it('defaults to an empty array when never saved', () => {
    expect(loadSettings().seenCoachMarks).toEqual([])
  })

  it('round-trips a saved list via patchSettings', () => {
    patchSettings({ seenCoachMarks: ['timer', 'planning'] })
    expect(loadSettings().seenCoachMarks).toEqual(['timer', 'planning'])
  })

  it('a settings row saved before this field existed still resolves to []', () => {
    localStorage.setItem('pomodoro_settings', JSON.stringify({ theme: 'dark' }))
    expect(loadSettings().seenCoachMarks).toEqual([])
  })
})

describe('Categories', () => {
  it('round-trips a saved category and can clear all categories', () => {
    saveCategories([{ id: 'c1', name: 'Coding', color: '#4a8c82' }])
    expect(loadCategories()).toEqual([
      {
        id: 'c1',
        name: 'Coding',
        color: '#4a8c82',
        isDefault: false,
        userId: 'local',
        createdAt: null,
        updatedAt: null,
      },
    ])

    clearCategories()
    expect(loadCategories()).toEqual([])
  })

  it('defaults a missing color to null instead of crashing', () => {
    localStorage.setItem('pomodoro_categories', JSON.stringify([{ id: 'c1', name: 'Coding' }]))
    expect(loadCategories()).toEqual([
      {
        id: 'c1',
        name: 'Coding',
        color: null,
        isDefault: false,
        userId: 'local',
        createdAt: null,
        updatedAt: null,
      },
    ])
  })

  it('defaults userId/createdAt/updatedAt for old records, but preserves them when already present', () => {
    localStorage.setItem('pomodoro_categories', JSON.stringify([{ id: 'c1', name: 'Coding' }]))
    expect(loadCategories()[0]).toMatchObject({ userId: 'local', createdAt: null, updatedAt: null })

    localStorage.setItem(
      'pomodoro_categories',
      JSON.stringify([
        { id: 'c1', name: 'Coding', userId: 'u-42', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
      ])
    )
    expect(loadCategories()[0]).toMatchObject({
      userId: 'u-42',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })
})

describe('Void log', () => {
  it('adds and removes a void entry, normalizing missing fields and stamping created/updated timestamps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T09:12:00.000Z'))
    try {
      addVoidLogEntry({
        id: 'v1',
        date: '2026-01-01',
        time: '09:12',
        activity: 'Write report',
        categoryIds: ['cat1'],
        elapsedSeconds: 753,
        reason: 'Got called into a meeting',
      })
      expect(loadVoidLog()).toEqual([
        {
          id: 'v1',
          date: '2026-01-01',
          time: '09:12',
          activity: 'Write report',
          categoryIds: ['cat1'],
          elapsedSeconds: 753,
          reason: 'Got called into a meeting',
          userId: 'local',
          createdAt: '2026-01-01T09:12:00.000Z',
          updatedAt: '2026-01-01T09:12:00.000Z',
        },
      ])
    } finally {
      vi.useRealTimers()
    }

    removeVoidLogEntry('v1')
    expect(loadVoidLog()).toEqual([])
  })

  it('defaults a missing reason/categoryIds/activity instead of crashing', () => {
    localStorage.setItem(
      'pomodoro_void_log',
      JSON.stringify([{ id: 'v1', date: '2026-01-01', elapsedSeconds: 100 }])
    )
    expect(loadVoidLog()).toEqual([
      {
        id: 'v1',
        date: '2026-01-01',
        time: '',
        activity: null,
        categoryIds: [],
        elapsedSeconds: 100,
        reason: '',
        userId: 'local',
        createdAt: null,
        updatedAt: null,
      },
    ])
  })

  it('clearVoidLog removes only the void log', () => {
    addVoidLogEntry({ id: 'v1', date: '2026-01-01', elapsedSeconds: 10 })
    clearVoidLog()
    expect(loadVoidLog()).toEqual([])
  })
})

describe('backend-readiness metadata (userId/createdAt/updatedAt)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stamps createdAt/updatedAt/userId on a new activity record, and bumps only updatedAt on update', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
    addActivityRecord({ id: 'r1', date: '2026-01-01', activity: 'Write report', real: 2 })
    let [record] = loadActivityLog()
    expect(record).toMatchObject({
      userId: 'local',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    })

    vi.setSystemTime(new Date('2026-01-01T11:30:00.000Z'))
    updateActivityRecord('r1', { real: 3 })
    ;[record] = loadActivityLog()
    expect(record).toMatchObject({
      real: 3,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T11:30:00.000Z',
    })
  })

  it('stamps createdAt/updatedAt/userId on a new tick', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
    addTick({ id: 'k1', type: 'pomodoro', date: '2026-01-01' })
    const [tick] = loadTicks()
    expect(tick).toMatchObject({
      userId: 'local',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    })
  })

  it('leaves an already-stamped record\'s userId/timestamps untouched', () => {
    addActivityRecord({
      id: 'r1',
      date: '2026-01-01',
      activity: 'Legacy import',
      real: 1,
      userId: 'u-42',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    const [record] = loadActivityLog()
    expect(record).toMatchObject({
      userId: 'u-42',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
  })
})

describe('importBackup', () => {
  it('replace mode wipes each collection and writes the file contents as-is, including settings', () => {
    saveInventory([{ id: 'old', text: 'stale' }])
    patchSettings({ theme: 'dark', cycleLength: 4 })

    importBackup(
      {
        inventory: [{ id: 'new', text: 'fresh' }],
        settings: { theme: 'light', cycleLength: 6, chimeStyle: 'soft' },
      },
      'replace'
    )

    expect(loadInventory()).toMatchObject([{ id: 'new', text: 'fresh' }])
    expect(loadSettings()).toMatchObject({ theme: 'light', cycleLength: 6 })
  })

  it('replace mode leaves a collection untouched when the import omits it', () => {
    saveTodayTasks([{ id: 't1', text: 'kept' }])
    importBackup({ inventory: [] }, 'replace')
    expect(loadTodayTasks()).toHaveLength(1)
  })

  it('merge mode combines collections by id (newer updatedAt wins) and leaves settings untouched', () => {
    saveInventory([{ id: 'a', text: 'current', updatedAt: '2026-01-01T00:00:00.000Z' }])
    patchSettings({ theme: 'dark' })

    importBackup(
      {
        inventory: [
          { id: 'a', text: 'imported-newer', updatedAt: '2026-02-01T00:00:00.000Z' },
          { id: 'b', text: 'imported-new-id' },
        ],
        settings: { theme: 'light' },
      },
      'merge'
    )

    const items = loadInventory()
    expect(items.find((i) => i.id === 'a').text).toBe('imported-newer')
    expect(items.find((i) => i.id === 'b').text).toBe('imported-new-id')
    expect(loadSettings().theme).toBe('dark')
  })
})

describe('importActivityLogCSV', () => {
  const header =
    'date,time,activity,category,estimate,reestimate1,reestimate2,real,diff,diffI,diffII,internal,external,unplanned,notes'

  it('replace mode wipes the activity log and writes the CSV rows as new records', () => {
    addActivityRecord({ id: 'old', date: '2020-01-01', activity: 'stale', real: 1 })
    const rows = [
      header.split(','),
      '2026-01-01,09:00,Write report,,2,,,3,1,,,0,0,false,'.split(','),
    ]

    importActivityLogCSV(rows, [], 'replace')

    const log = loadActivityLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ activity: 'Write report', real: 3 })
  })

  it('merge mode only adds rows that do not match an existing record by date+time+activity', () => {
    addActivityRecord({ id: 'r1', date: '2026-01-01', time: '09:00', activity: 'Write report', real: 1 })
    const rows = [
      header.split(','),
      '2026-01-01,09:00,Write report,,,,,999,,,,0,0,false,'.split(','),
      '2026-01-02,10:00,Fix bug,,,,,2,,,,0,0,false,'.split(','),
    ]

    importActivityLogCSV(rows, [], 'merge')

    const log = loadActivityLog()
    expect(log).toHaveLength(2)
    expect(log.find((r) => r.activity === 'Write report').real).toBe(1)
    expect(log.find((r) => r.activity === 'Fix bug').real).toBe(2)
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
    saveCategories([{ id: 'c1', name: 'Coding', color: '#4a8c82' }])
    addVoidLogEntry({ id: 'v1', date: '2026-01-01', elapsedSeconds: 10 })
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
    expect(loadCategories()).toHaveLength(1)
    expect(loadVoidLog()).toHaveLength(1)
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
    expect(loadCategories()).toHaveLength(1)
    expect(loadVoidLog()).toHaveLength(1)
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
    expect(loadCategories()).toHaveLength(1)
    expect(loadVoidLog()).toHaveLength(1)
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
    expect(loadCategories()).toHaveLength(1)
    expect(loadVoidLog()).toHaveLength(1)
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
    expect(loadCategories()).toHaveLength(1)
    expect(loadVoidLog()).toHaveLength(1)
    expect(loadSettings()).toMatchObject({ cycleLength: 6 })
  })

  it('clearCategories removes only Categories, leaving everything else (incl. Settings) intact', () => {
    seedEverything()
    clearCategories()

    expect(loadCategories()).toEqual([])
    expect(loadInventory()).toHaveLength(1)
    expect(loadTodayTasks()).toHaveLength(1)
    expect(loadActivityLog()).toHaveLength(1)
    expect(loadTicks()).toHaveLength(1)
    expect(loadVoidLog()).toHaveLength(1)
    expect(loadSettings()).toMatchObject({ cycleLength: 6 })
  })

  it('clearVoidLog removes only the Void log, leaving everything else (incl. Settings) intact', () => {
    seedEverything()
    clearVoidLog()

    expect(loadVoidLog()).toEqual([])
    expect(loadInventory()).toHaveLength(1)
    expect(loadTodayTasks()).toHaveLength(1)
    expect(loadActivityLog()).toHaveLength(1)
    expect(loadTicks()).toHaveLength(1)
    expect(loadCategories()).toHaveLength(1)
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
    expect(loadCategories()).toEqual([])
    expect(loadVoidLog()).toEqual([])
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
