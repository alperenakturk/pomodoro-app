import { useEffect, useState } from 'react'
import { loadActivityLog, subscribeToChanges } from '../lib/storage'

function RecordsLog() {
  const [log, setLog] = useState(() => loadActivityLog())

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => setLog(loadActivityLog()))
    return unsubscribe
  }, [])

  const recent = [...log].reverse().slice(0, 8)

  return (
    <div className="bg-cream rounded-3xl px-6 py-6 shadow-xl w-full h-full">
      <p className="font-display text-tomato text-xs tracking-widest uppercase mb-4">
        Records
      </p>

      {recent.length === 0 && (
        <p className="text-sage text-sm font-sans text-center py-2">
          No completed tasks yet.
        </p>
      )}

      <ul className="flex flex-col gap-2 font-sans text-sm">
        {recent.map((r) => (
          <li key={r.id} className="border-b border-sage/20 pb-2">
            <div className="flex justify-between text-ink">
              <span>{r.activity}</span>
              <span className="text-sage text-xs">{r.date}</span>
            </div>
            <div className="text-sage text-xs flex gap-3 mt-1">
              <span>Estimate: {r.estimate ?? '-'}</span>
              <span>Actual: {r.real}</span>
              <span
                className={
                  r.diff > 0 ? 'text-tomato' : r.diff < 0 ? 'text-amber' : ''
                }
              >
                Diff: {r.diff == null ? '-' : `${r.diff > 0 ? '+' : ''}${r.diff}`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default RecordsLog
