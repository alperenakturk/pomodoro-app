import { useEffect, useState } from 'react'
import {
  loadActivityLog,
  subscribeToChanges,
  removeActivityRecord,
  updateActivityRecord,
  exportAllData,
} from '../lib/storage'
import { activityLogToCSV, downloadFile } from '../lib/export'

const inputClass =
  'bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs font-sans'

function recomputeDiff(estimate, real) {
  return estimate != null && estimate !== '' ? Number(real) - Number(estimate) : null
}

function RecordRow({ record, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [activity, setActivity] = useState(record.activity)
  const [type, setType] = useState(record.type ?? '')
  const [estimate, setEstimate] = useState(record.estimate ?? '')
  const [real, setReal] = useState(record.real)

  function handleSave() {
    const nextEstimate = estimate === '' ? null : Number(estimate)
    const nextReal = Number(real)
    updateActivityRecord(record.id, {
      activity: activity.trim() || record.activity,
      type: type.trim(),
      estimate: nextEstimate,
      real: nextReal,
      diff: recomputeDiff(nextEstimate, nextReal),
    })
    setEditing(false)
  }

  function handleCancel() {
    setActivity(record.activity)
    setType(record.type ?? '')
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
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Category"
            aria-label="Category"
            className={`w-24 ${inputClass}`}
          />
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
          {record.type && (
            <span className="text-sage text-xs bg-cream/5 rounded px-1.5 py-0.5 ml-2">
              {record.type}
            </span>
          )}
          {record.pairWith && (
            <span className="text-sage text-xs bg-cream/5 rounded px-1.5 py-0.5 ml-2">
              with {record.pairWith}
            </span>
          )}
        </span>
        <span className="text-sage text-xs">{record.date}</span>
      </div>
      <div className="text-sage text-xs flex gap-3 mt-1 items-center">
        <span>Estimate: {record.estimate ?? '-'}</span>
        <span>Actual: {record.real}</span>
        <span
          className={
            record.diff > 0 ? 'text-tomato' : record.diff < 0 ? 'text-amber' : ''
          }
        >
          Diff: {record.diff == null ? '-' : `${record.diff > 0 ? '+' : ''}${record.diff}`}
        </span>
        {record.diffI != null && (
          <span className={record.diffI > 0 ? 'text-tomato' : record.diffI < 0 ? 'text-amber' : ''}>
            Diff I: {record.diffI > 0 ? '+' : ''}
            {record.diffI}
          </span>
        )}
        {record.diffII != null && (
          <span className={record.diffII > 0 ? 'text-tomato' : record.diffII < 0 ? 'text-amber' : ''}>
            Diff II: {record.diffII > 0 ? '+' : ''}
            {record.diffII}
          </span>
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

function RecordsLog() {
  const [log, setLog] = useState(() => loadActivityLog())

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => setLog(loadActivityLog()))
    return unsubscribe
  }, [])

  function handleDelete(id) {
    if (window.confirm('Delete this record?')) {
      removeActivityRecord(id)
    }
  }

  function handleExportCSV() {
    downloadFile('pomodoro-records.csv', activityLogToCSV(log), 'text/csv')
  }

  function handleExportJSON() {
    downloadFile(
      'pomodoro-backup.json',
      JSON.stringify(exportAllData(), null, 2),
      'application/json'
    )
  }

  const recent = [...log].reverse().slice(0, 8)

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

      {recent.length === 0 && (
        <p className="text-sage text-sm font-sans text-center py-2">
          No completed tasks yet.
        </p>
      )}

      <ul className="flex flex-col gap-2 font-sans text-sm">
        {recent.map((r) => (
          <RecordRow key={r.id} record={r} onDelete={handleDelete} />
        ))}
      </ul>
    </div>
  )
}

export default RecordsLog
