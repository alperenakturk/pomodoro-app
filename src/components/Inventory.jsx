import { useState } from 'react'

// Rule 4: tasks estimated above this should be broken down into sub-tasks.
const MAX_RECOMMENDED_ESTIMATE = 7

function isOverdue(deadline) {
  if (!deadline) return false
  return deadline < new Date().toISOString().slice(0, 10)
}

function Inventory({ items, addItem, removeItem, toggleDone, onSendToToday }) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')
  const [notes, setNotes] = useState('')
  const [deadline, setDeadline] = useState('')
  const [unplanned, setUnplanned] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    addItem(text.trim(), estimate ? Number(estimate) : null, {
      notes: notes.trim(),
      deadline: deadline || null,
      unplanned,
    })
    setText('')
    setEstimate('')
    setNotes('')
    setDeadline('')
    setUnplanned(false)
  }

  return (
    <div className="bg-cream rounded-3xl px-6 py-6 shadow-xl w-full h-full">
      <p className="font-display text-tomato text-xs tracking-widest uppercase mb-4">
        Inventory
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New task..."
          className="flex-1 min-w-0 font-sans text-sm px-3 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="inventory-estimate" className="text-sage text-[10px] font-sans uppercase tracking-wide">
            Est.
          </label>
          <input
            id="inventory-estimate"
            type="number"
            min="1"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="# pomodoros"
            className="w-20 font-sans text-sm px-2 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
          />
        </div>
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream"
        >
          Add
        </button>
      </form>

      <div className="flex gap-2 mb-4 items-center">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 font-sans text-xs px-3 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="font-sans text-xs px-2 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <label className="flex items-center gap-1 text-sage text-xs font-sans whitespace-nowrap">
          <input
            type="checkbox"
            checked={unplanned}
            onChange={(e) => setUnplanned(e.target.checked)}
          />
          U
        </label>
      </div>

      {Number(estimate) > MAX_RECOMMENDED_ESTIMATE && (
        <p className="text-tomato text-xs font-sans mb-4 -mt-2">
          More than {MAX_RECOMMENDED_ESTIMATE} pomodoros — break the task into sub-tasks (Rule 4).
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            Inventory is empty.
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-1 font-sans text-sm text-ink border-b border-sage/10 pb-2 last:border-0"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleDone(item.id)}
                className={
                  'w-4 h-4 rounded-full border flex-shrink-0 ' +
                  (item.done ? 'bg-sage border-sage' : 'border-sage')
                }
                aria-label="mark as done"
              />
              <span className={item.done ? 'flex-1 line-through text-sage' : 'flex-1'}>
                {item.text}
              </span>
              {item.unplanned && (
                <span className="text-amber text-xs font-semibold" title="Unplanned">
                  U
                </span>
              )}
              {item.deadline && (
                <span
                  className={
                    isOverdue(item.deadline)
                      ? 'text-tomato text-xs font-semibold'
                      : 'text-sage text-xs'
                  }
                >
                  {item.deadline}
                </span>
              )}
              {item.estimate && (
                <span
                  className={
                    item.estimate > MAX_RECOMMENDED_ESTIMATE
                      ? 'text-tomato text-xs font-semibold'
                      : 'text-sage text-xs'
                  }
                  title={
                    item.estimate > MAX_RECOMMENDED_ESTIMATE
                      ? `More than ${MAX_RECOMMENDED_ESTIMATE} — break it up (Rule 4)`
                      : undefined
                  }
                >
                  {item.estimate} pom.{item.estimate > MAX_RECOMMENDED_ESTIMATE ? ' ⚠' : ''}
                </span>
              )}
              <button
                type="button"
                onClick={() => onSendToToday(item.text, item.estimate, item.id)}
                className="text-tomato text-xs"
              >
                Add to today
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-sage text-xs"
              >
                Delete
              </button>
            </div>
            {item.notes && (
              <p className="text-sage text-xs italic pl-6">{item.notes}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Inventory
