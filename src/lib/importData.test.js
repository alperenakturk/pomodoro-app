import { describe, it, expect } from 'vitest'
import {
  validateBackupShape,
  mergeCollectionById,
  parseCSV,
  validateActivityCSV,
  csvRowsToActivityRecords,
  mergeActivityRecordsByNaturalKey,
} from './importData'

describe('validateBackupShape', () => {
  it('accepts a well-formed backup object', () => {
    expect(
      validateBackupShape({
        exportedAt: '2026-01-01T00:00:00.000Z',
        inventory: [],
        todayTasks: [],
        activityLog: [],
        ticks: [],
        settings: { theme: 'dark' },
        timetable: [],
        categories: [],
        voidLog: [],
      })
    ).toBe(true)
  })

  it('accepts a partial object (missing keys are fine, normalize fills defaults on load)', () => {
    expect(validateBackupShape({ inventory: [] })).toBe(true)
    expect(validateBackupShape({})).toBe(true)
  })

  it('rejects non-objects, null, and arrays', () => {
    expect(validateBackupShape(null)).toBe(false)
    expect(validateBackupShape('a string')).toBe(false)
    expect(validateBackupShape([1, 2, 3])).toBe(false)
    expect(validateBackupShape(42)).toBe(false)
  })

  it('rejects when a known array field is not actually an array', () => {
    expect(validateBackupShape({ inventory: 'not an array' })).toBe(false)
    expect(validateBackupShape({ activityLog: { oops: true } })).toBe(false)
  })

  it('rejects when settings is present but not a plain object', () => {
    expect(validateBackupShape({ settings: [1, 2] })).toBe(false)
    expect(validateBackupShape({ settings: 'nope' })).toBe(false)
  })
})

describe('mergeCollectionById', () => {
  it('keeps existing-only and adds incoming-only records', () => {
    const existing = [{ id: 'a', text: 'A' }]
    const incoming = [{ id: 'b', text: 'B' }]
    const result = mergeCollectionById(existing, incoming)
    expect(result).toEqual(expect.arrayContaining([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]))
    expect(result).toHaveLength(2)
  })

  it('keeps the incoming record when it has a newer updatedAt', () => {
    const existing = [{ id: 'a', text: 'old', updatedAt: '2026-01-01T00:00:00.000Z' }]
    const incoming = [{ id: 'a', text: 'new', updatedAt: '2026-01-02T00:00:00.000Z' }]
    expect(mergeCollectionById(existing, incoming)).toEqual([
      { id: 'a', text: 'new', updatedAt: '2026-01-02T00:00:00.000Z' },
    ])
  })

  it('keeps the existing record when the incoming one is older', () => {
    const existing = [{ id: 'a', text: 'current', updatedAt: '2026-01-05T00:00:00.000Z' }]
    const incoming = [{ id: 'a', text: 'stale', updatedAt: '2026-01-01T00:00:00.000Z' }]
    expect(mergeCollectionById(existing, incoming)).toEqual([
      { id: 'a', text: 'current', updatedAt: '2026-01-05T00:00:00.000Z' },
    ])
  })

  it('keeps existing when both records have no updatedAt (no evidence to prefer incoming)', () => {
    const existing = [{ id: 'a', text: 'current' }]
    const incoming = [{ id: 'a', text: 'incoming' }]
    expect(mergeCollectionById(existing, incoming)).toEqual([{ id: 'a', text: 'current' }])
  })

  it('prefers whichever side has a real updatedAt over a null one', () => {
    const existingHasTimestamp = mergeCollectionById(
      [{ id: 'a', text: 'current', updatedAt: '2026-01-01T00:00:00.000Z' }],
      [{ id: 'a', text: 'incoming', updatedAt: null }]
    )
    expect(existingHasTimestamp[0].text).toBe('current')

    const incomingHasTimestamp = mergeCollectionById(
      [{ id: 'a', text: 'current', updatedAt: null }],
      [{ id: 'a', text: 'incoming', updatedAt: '2026-01-01T00:00:00.000Z' }]
    )
    expect(incomingHasTimestamp[0].text).toBe('incoming')
  })
})

describe('parseCSV', () => {
  it('parses a simple comma-separated table', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields containing commas and doubled quotes', () => {
    expect(parseCSV('name,note\n"Smith, John","She said ""hi"""')).toEqual([
      ['name', 'note'],
      ['Smith, John', 'She said "hi"'],
    ])
  })

  it('handles a quoted field containing an embedded newline', () => {
    expect(parseCSV('name,note\n"Task","line one\nline two"\nfoo,bar')).toEqual([
      ['name', 'note'],
      ['Task', 'line one\nline two'],
      ['foo', 'bar'],
    ])
  })
})

describe('validateActivityCSV', () => {
  it('accepts a header row matching CSV_COLUMNS exactly', () => {
    const rows = parseCSV(
      'date,time,activity,category,estimate,reestimate1,reestimate2,real,diff,diffI,diffII,internal,external,unplanned,notes'
    )
    expect(validateActivityCSV(rows)).toBe(true)
  })

  it('rejects a header with missing/extra/reordered columns', () => {
    expect(validateActivityCSV(parseCSV('date,time,activity'))).toBe(false)
    expect(validateActivityCSV(parseCSV('time,date,activity,category,estimate,reestimate1,reestimate2,real,diff,diffI,diffII,internal,external,unplanned,notes'))).toBe(false)
  })

  it('rejects an empty file', () => {
    expect(validateActivityCSV([])).toBe(false)
  })
})

describe('csvRowsToActivityRecords', () => {
  const header =
    'date,time,activity,category,estimate,reestimate1,reestimate2,real,diff,diffI,diffII,internal,external,unplanned,notes'

  it('converts a data row into an activityLog-shaped record, resolving category names to ids', () => {
    const categories = [{ id: 'c1', name: 'Coding', color: '#4a8c82' }]
    const rows = parseCSV(`${header}\n2026-01-01,09:00,Write report,Coding,2,,,3,1,,,1,0,false,Some notes`)
    const [record] = csvRowsToActivityRecords(rows, categories)

    expect(record).toMatchObject({
      date: '2026-01-01',
      time: '09:00',
      activity: 'Write report',
      categoryIds: ['c1'],
      notes: 'Some notes',
      estimate: 2,
      reestimate1: null,
      reestimate2: null,
      real: 3,
      diff: 1,
      diffI: null,
      diffII: null,
      internal: 1,
      external: 0,
      unplanned: false,
      userId: 'local',
    })
    expect(record.id).toBeTruthy()
    expect(record.createdAt).toBeTruthy()
    expect(record.updatedAt).toBeTruthy()
  })

  it('drops a category name that no longer resolves instead of crashing', () => {
    const rows = parseCSV(`${header}\n2026-01-01,09:00,Task,Deleted Category,,,,,,,,0,0,false,`)
    const [record] = csvRowsToActivityRecords(rows, [])
    expect(record.categoryIds).toEqual([])
  })
})

describe('mergeActivityRecordsByNaturalKey', () => {
  it('adds a row with no matching existing record', () => {
    const existing = [{ id: 'r1', date: '2026-01-01', time: '09:00', activity: 'A' }]
    const incoming = [{ id: 'r2', date: '2026-01-02', time: '10:00', activity: 'B' }]
    expect(mergeActivityRecordsByNaturalKey(existing, incoming)).toHaveLength(2)
  })

  it('skips a row matching an existing record by date+time+activity, keeping the existing one', () => {
    const existing = [{ id: 'r1', date: '2026-01-01', time: '09:00', activity: 'A', real: 5 }]
    const incoming = [{ id: 'r2', date: '2026-01-01', time: '09:00', activity: 'A', real: 999 }]
    const result = mergeActivityRecordsByNaturalKey(existing, incoming)
    expect(result).toEqual([{ id: 'r1', date: '2026-01-01', time: '09:00', activity: 'A', real: 5 }])
  })
})
