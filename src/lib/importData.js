import { CSV_COLUMNS } from './export'

// The collections in exportAllData()'s shape that are plain arrays of
// id-bearing records — used both to validate an imported JSON backup's shape
// and to know which keys mergeAllCollections() should merge by id. `settings`
// is deliberately excluded: it's a single preferences object, not a record
// list, and merge mode leaves the user's current settings untouched (see
// storage.js's importBackup).
export const BACKUP_ARRAY_KEYS = [
  'inventory',
  'todayTasks',
  'activityLog',
  'ticks',
  'timetable',
  'categories',
  'voidLog',
  'cardDraws',
]

// Structural check only (right shape, right types) — not a full schema
// validation, since normalize*() in storage.js already tolerates missing/
// legacy fields on load. Anything that isn't a plain object, or has one of
// the known array fields present but not actually an array, is rejected so
// a malformed file can't corrupt existing data.
export function validateBackupShape(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  for (const key of BACKUP_ARRAY_KEYS) {
    if (key in data && !Array.isArray(data[key])) return false
  }
  if ('settings' in data && (typeof data.settings !== 'object' || data.settings === null || Array.isArray(data.settings))) {
    return false
  }
  return true
}

// Merges two id-keyed record lists: records only in `existing` or only in
// `incoming` both survive; records in both are resolved by `updatedAt`
// (newer wins). A record with no `updatedAt` (pre-dates the backend-
// readiness metadata, or came from a source that never set it) is treated
// as older than one that has a real timestamp, since there's no better
// signal available — and if neither side has one, `existing` wins so a
// merge is never allowed to silently clobber current data on a coin flip.
export function mergeCollectionById(existing, incoming) {
  const merged = new Map(existing.map((r) => [r.id, r]))
  for (const item of incoming) {
    const current = merged.get(item.id)
    if (!current) {
      merged.set(item.id, item)
      continue
    }
    const currentTime = current.updatedAt ? Date.parse(current.updatedAt) : -Infinity
    const incomingTime = item.updatedAt ? Date.parse(item.updatedAt) : -Infinity
    if (incomingTime > currentTime) merged.set(item.id, item)
  }
  return [...merged.values()]
}

// A small hand-rolled CSV parser (mirroring export.js's escapeCSVField)
// rather than a library — handles quoted fields containing commas, quotes
// (doubled), and embedded newlines (a multi-line `notes` field), which a
// naive split('\n') + split(',') would break on. Returns an array of rows,
// each an array of raw field strings (first row is the header).
export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }
    field += char
    i += 1
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

// The header row must match CSV_COLUMNS exactly (same columns, same order) —
// this is specifically the shape activityLogToCSV() produces, not a general
// "any CSV" importer.
export function validateActivityCSV(rows) {
  if (rows.length === 0) return false
  const header = rows[0]
  return header.length === CSV_COLUMNS.length && CSV_COLUMNS.every((col, i) => header[i] === col)
}

function parseNullableNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseCountNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// Converts parsed CSV rows (header + data rows, as from parseCSV) back into
// activityLog record shape. `category` in the CSV is a "; "-joined list of
// category *names* (not ids, see activityLogToCSV) — resolved against the
// current categories list by exact name match; a name that doesn't resolve
// (renamed/deleted since export, or a typo) is silently dropped from that
// record's tags rather than failing the import, the same graceful-
// degradation already used everywhere a categoryId fails to resolve.
export function csvRowsToActivityRecords(rows, categories) {
  const idByName = new Map(categories.map((c) => [c.name, c.id]))
  const [header, ...dataRows] = rows
  const now = new Date().toISOString()

  return dataRows.map((row) => {
    const get = (col) => row[header.indexOf(col)] ?? ''
    return {
      id: crypto.randomUUID(),
      date: get('date'),
      time: get('time'),
      activity: get('activity'),
      categoryIds: get('category')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => idByName.get(name))
        .filter(Boolean),
      notes: get('notes'),
      estimate: parseNullableNumber(get('estimate')),
      reestimate1: parseNullableNumber(get('reestimate1')),
      reestimate2: parseNullableNumber(get('reestimate2')),
      real: parseCountNumber(get('real')),
      diff: parseNullableNumber(get('diff')),
      diffI: parseNullableNumber(get('diffI')),
      diffII: parseNullableNumber(get('diffII')),
      internal: parseCountNumber(get('internal')),
      external: parseCountNumber(get('external')),
      unplanned: get('unplanned') === 'true',
      userId: 'local',
      createdAt: now,
      updatedAt: now,
    }
  })
}

// CSV rows carry no id (see CSV_COLUMNS), so "merge by id" isn't possible —
// the closest available notion of "the same record" is the (date, time,
// activity) triple. On a match, the existing record is kept as-is (there's
// no updatedAt on the CSV side either, so there's no reliable way to tell
// which is newer); only rows with no matching existing record are appended.
export function mergeActivityRecordsByNaturalKey(existing, incoming) {
  const keyOf = (r) => `${r.date}|${r.time}|${r.activity}`
  const existingKeys = new Set(existing.map(keyOf))
  const additions = incoming.filter((r) => !existingKeys.has(keyOf(r)))
  return [...existing, ...additions]
}
