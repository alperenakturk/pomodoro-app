import { useEffect, useState } from 'react'
import {
  loadActivityLog,
  subscribeToChanges,
  removeActivityRecord,
  updateActivityRecord,
  exportAllData,
  loadVoidLog,
  removeVoidLogEntry,
} from '../lib/storage'
import { activityLogToCSV, downloadFile } from '../lib/export'
import { compactInputClass as inputClass } from '../lib/constants'
import { diffClass, diffLabel } from '../lib/diffHelpers'
import CategorySelect from './CategorySelect'
import CategoryTagPicker from './CategoryTagPicker'

function recomputeDiff(estimate, real) {
  return estimate != null && estimate !== '' ? Number(real) - Number(estimate) : null
}

const WORK_SECONDS = 25 * 60
function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function CategoryTag({ category }) {
  return (
    <span className="text-sage text-xs bg-cream/5 rounded px-1.5 py-0.5 ml-2 inline-flex items-center gap-1">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      {category.name}
    </span>
  )
}

function CategoryTags({ categoryIds, categories }) {
  const resolved = categoryIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean)
  return (
    <>
      {resolved.map((category) => (
        <CategoryTag key={category.id} category={category} />
      ))}
    </>
  )
}

function RecordRow({ record, categories, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [activity, setActivity] = useState(record.activity)
  const [categoryIds, setCategoryIds] = useState(record.categoryIds ?? [])
  const [estimate, setEstimate] = useState(record.estimate ?? '')
  const [real, setReal] = useState(record.real)
  const [notesExpanded, setNotesExpanded] = useState(false)

  function handleSave() {
    const nextEstimate = estimate === '' ? null : Number(estimate)
    const nextReal = Number(real)
    updateActivityRecord(record.id, {
      activity: activity.trim() || record.activity,
      categoryIds,
      estimate: nextEstimate,
      real: nextReal,
      diff: recomputeDiff(nextEstimate, nextReal),
      diffI: recomputeDiff(record.reestimate1, nextReal),
      diffII: recomputeDiff(record.reestimate2, nextReal),
    })
    setEditing(false)
  }

  function handleCancel() {
    setActivity(record.activity)
    setCategoryIds(record.categoryIds ?? [])
    setEstimate(record.estimate ?? '')
    setReal(record.real)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="border-b border-cream/10 pb-2">
        <div className="flex gap-2 mb-2">
          <input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            aria-label="Activity name"
            className={`flex-1 ${inputClass}`}
          />
          <CategoryTagPicker categories={categories} value={categoryIds} onChange={setCategoryIds} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`est-${record.id}`} className="text-sage text-[10px] uppercase tracking-wide">
            Est.
          </label>
          <input
            id={`est-${record.id}`}
            type="number"
            min="0"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            className={`w-14 ${inputClass}`}
          />
          <label htmlFor={`real-${record.id}`} className="text-sage text-[10px] uppercase tracking-wide">
            Real
          </label>
          <input
            id={`real-${record.id}`}
            type="number"
            min="0"
            value={real}
            onChange={(e) => setReal(e.target.value)}
            className={`w-14 ${inputClass}`}
          />
          <button
            type="button"
            onClick={handleSave}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream ml-auto"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="border-b border-cream/10 pb-2">
      <div className="flex justify-between text-cream">
        <span>
          {record.activity}
          <CategoryTags categoryIds={record.categoryIds} categories={categories} />
          {record.notes && (
            <button
              type="button"
              onClick={() => setNotesExpanded((prev) => !prev)}
              className="text-sage text-xs ml-2 hover:text-cream"
              aria-expanded={notesExpanded}
              title={notesExpanded ? 'Hide description' : 'Show description'}
            >
              {notesExpanded ? '📝▾' : '📝'}
            </button>
          )}
        </span>
        <span className="text-sage text-xs">{record.date}</span>
      </div>
      {notesExpanded && record.notes && (
        <p className="text-sage text-xs whitespace-pre-wrap mt-1">{record.notes}</p>
      )}
      <div className="text-sage text-xs flex gap-3 mt-1 items-center">
        <span>Estimate: {record.estimate ?? '-'}</span>
        <span>Actual: {record.real}</span>
        <span className={diffClass(record.diff)}>Diff: {diffLabel(record.diff)}</span>
        {record.diffI != null && (
          <span className={diffClass(record.diffI)}>Diff I: {diffLabel(record.diffI)}</span>
        )}
        {record.diffII != null && (
          <span className={diffClass(record.diffII)}>Diff II: {diffLabel(record.diffII)}</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto text-cream"
          aria-label="edit record"
          title="Edit"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onDelete(record.id)}
          className="text-sage"
          aria-label="delete record"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

// A simple, unobtrusive daily-journal entry — no estimate/real/diff, no
// styling weight, and deliberately not touched by the date/category filters
// above (those exist for Records Log's aggregation-adjacent use, not this;
// see storage.js's pomodoro_void_log comment on why Reports never reads it).
function VoidLogRow({ entry, categories, onDelete }) {
  const category = categories.find((c) => entry.categoryIds.includes(c.id)) ?? null
  return (
    <li className="text-sage text-xs font-sans flex items-center gap-2">
      <span className="flex-1">
        Voided at {formatElapsed(entry.elapsedSeconds)} / {formatElapsed(WORK_SECONDS)}
        {entry.activity && <> — {entry.activity}</>}
        {category && <CategoryTag category={category} />}
        {entry.reason && <> — {entry.reason}</>}
      </span>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        className="text-sage hover:text-cream flex-shrink-0"
        aria-label="delete void log entry"
        title="Delete"
      >
        ✕
      </button>
    </li>
  )
}

function RecordsLog({ categories = [] }) {
  const [log, setLog] = useState(() => loadActivityLog())
  const [voidLog, setVoidLog] = useState(() => loadVoidLog())
  const [dateFilter, setDateFilter] = useState('')
  // undefined = no category filter ("all"); null = filter to uncategorized
  // only — those two must stay distinct, see CategorySelect's allowAll note.
  const [categoryFilter, setCategoryFilter] = useState(undefined)

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      setLog(loadActivityLog())
      setVoidLog(loadVoidLog())
    })
    return unsubscribe
  }, [])

  function handleDelete(id) {
    if (window.confirm('Delete this record?')) {
      removeActivityRecord(id)
    }
  }

  function handleDeleteVoidEntry(id) {
    if (window.confirm('Delete this void log entry?')) {
      removeVoidLogEntry(id)
    }
  }

  function handleExportCSV() {
    downloadFile('pomodoro-records.csv', activityLogToCSV(log, categories), 'text/csv')
  }

  function handleExportJSON() {
    downloadFile(
      'pomodoro-backup.json',
      JSON.stringify(exportAllData(), null, 2),
      'application/json'
    )
  }

  const filtersActive = dateFilter !== '' || categoryFilter !== undefined
  // categoryFilter is one of: undefined (no filter), null ("Uncategorized"
  // only — records with an empty categoryIds array), or a category id (match
  // if that id is ANY of the record's tags, since a record can carry several).
  const filtered = log.filter((r) => {
    if (dateFilter !== '' && r.date !== dateFilter) return false
    if (categoryFilter === undefined) return true
    if (categoryFilter === null) return r.categoryIds.length === 0
    return r.categoryIds.includes(categoryFilter)
  })
  // With no filters, cap at the 8 most recent so the log doesn't grow
  // unbounded; once the user has deliberately narrowed it down (item 5:
  // date + category, AND logic), show every match instead of just the tail.
  const recent = filtersActive ? [...filtered].reverse() : [...filtered].reverse().slice(0, 8)

  function clearFilters() {
    setDateFilter('')
    setCategoryFilter(undefined)
  }

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          Records Log
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="text-sage text-xs"
            title="Export records as CSV"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="text-sage text-xs"
            title="Export a full JSON backup of all data"
          >
            JSON
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filter by date"
          className={inputClass}
        />
        <CategorySelect
          categories={categories}
          value={categoryFilter}
          onChange={setCategoryFilter}
          allowAll
          allLabel="All categories"
          className="w-32"
        />
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sage text-xs underline decoration-dotted"
          >
            Clear filters
          </button>
        )}
      </div>

      {recent.length === 0 && (
        <p className="text-sage text-sm font-sans text-center py-2">
          {filtersActive ? 'No records match these filters.' : 'No completed tasks yet.'}
        </p>
      )}

      <ul className="flex flex-col gap-2 font-sans text-sm">
        {recent.map((r) => (
          <RecordRow key={r.id} record={r} categories={categories} onDelete={handleDelete} />
        ))}
      </ul>

      {voidLog.length > 0 && (
        <div className="mt-4 pt-4 border-t border-cream/10">
          <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2">
            Voided Pomodoros
          </p>
          <ul className="flex flex-col gap-1.5">
            {[...voidLog]
              .reverse()
              .slice(0, 5)
              .map((entry) => (
                <VoidLogRow
                  key={entry.id}
                  entry={entry}
                  categories={categories}
                  onDelete={handleDeleteVoidEntry}
                />
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default RecordsLog
