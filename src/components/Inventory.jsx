import { useState } from 'react'
import { MAX_RECOMMENDED_ESTIMATE, inputClass } from '../lib/constants'

function isOverdue(deadline) {
  if (!deadline) return false
  return deadline < new Date().toISOString().slice(0, 10)
}

function InventoryRow({ item, onSendToToday, removeItem, toggleDone, updateItem, selected, onToggleSelect }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const [estimate, setEstimate] = useState(item.estimate ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [type, setType] = useState(item.type ?? '')
  const [deadline, setDeadline] = useState(item.deadline ?? '')

  function handleSave() {
    if (!text.trim()) return
    updateItem(item.id, {
      text: text.trim(),
      estimate: estimate === '' ? null : Number(estimate),
      notes: notes.trim(),
      type: type.trim(),
      deadline: deadline || null,
    })
    setEditing(false)
  }

  function handleCancel() {
    setText(item.text)
    setEstimate(item.estimate ?? '')
    setNotes(item.notes ?? '')
    setType(item.type ?? '')
    setDeadline(item.deadline ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 font-sans text-sm text-cream border-b border-cream/10 pb-2 last:border-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Task name"
          className={inputClass}
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="Est."
            aria-label="Estimate"
            className={`w-16 text-xs ${inputClass}`}
          />
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Category"
            aria-label="Category"
            className={`w-24 text-xs ${inputClass}`}
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Deadline"
            className={`text-xs ${inputClass}`}
          />
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className={`text-xs ${inputClass}`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream"
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
    <li className="flex flex-col gap-1 font-sans text-sm text-cream border-b border-cream/10 pb-2 last:border-0">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label={`select ${item.text} to combine`}
          title="Select to combine with other small tasks (Rule 5)"
          className="flex-shrink-0"
        />
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
        {item.type && (
          <span className="text-sage text-xs bg-cream/5 rounded px-1.5 py-0.5">{item.type}</span>
        )}
        {item.deadline && (
          <span
            className={
              isOverdue(item.deadline) ? 'text-tomato text-xs font-semibold' : 'text-sage text-xs'
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
          onClick={() => onSendToToday(item.text, item.estimate, item.id, item.unplanned, item.type)}
          className="text-tomato text-xs"
        >
          Add to today
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-cream"
          aria-label="edit inventory item"
          title="Edit"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this task from the inventory?')) {
              removeItem(item.id)
            }
          }}
          className="text-sage text-xs"
        >
          Delete
        </button>
      </div>
      {item.notes && <p className="text-sage text-xs italic pl-6">{item.notes}</p>}
    </li>
  )
}

function Inventory({
  items,
  addItem,
  removeItem,
  toggleDone,
  updateItem,
  combineItems,
  onSendToToday,
}) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')
  const [notes, setNotes] = useState('')
  const [type, setType] = useState('')
  const [deadline, setDeadline] = useState('')
  const [unplanned, setUnplanned] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCombine() {
    if (
      window.confirm(
        `Combine ${selectedIds.size} tasks into one? The originals will be replaced and this can't be undone.`
      )
    ) {
      combineItems([...selectedIds])
      setSelectedIds(new Set())
    }
  }

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    addItem(text.trim(), estimate ? Number(estimate) : null, {
      notes: notes.trim(),
      type: type.trim(),
      deadline: deadline || null,
      unplanned,
    })
    setText('')
    setEstimate('')
    setNotes('')
    setType('')
    setDeadline('')
    setUnplanned(false)
  }

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          Activity Inventory
        </p>
        <span className="text-sage text-xs font-sans">{items.length} items</span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New task..."
          aria-label="New task"
          className={`flex-1 min-w-0 ${inputClass}`}
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
            className={`w-20 px-2 ${inputClass}`}
          />
        </div>
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream"
        >
          Add
        </button>
      </form>

      <div className="flex gap-2 mb-2 items-center">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className={`flex-1 text-xs ${inputClass}`}
        />
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Category"
          aria-label="Category"
          className={`w-24 text-xs ${inputClass}`}
        />
      </div>

      <div className="flex gap-2 mb-4 items-center">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          aria-label="Deadline"
          className={`text-xs ${inputClass}`}
        />
        <button
          type="button"
          onClick={() => setUnplanned((prev) => !prev)}
          aria-pressed={unplanned}
          title="Mark as unplanned"
          className={
            'font-sans text-xs px-3 py-2 rounded-xl border whitespace-nowrap flex-shrink-0 ' +
            (unplanned
              ? 'bg-amber/20 border-amber/60 text-amber'
              : 'border-cream/15 text-sage')
          }
        >
          U
        </button>
      </div>

      {Number(estimate) > MAX_RECOMMENDED_ESTIMATE && (
        <p className="text-tomato text-xs font-sans mb-4 -mt-2">
          More than {MAX_RECOMMENDED_ESTIMATE} pomodoros — break the task into sub-tasks (Rule 4).
        </p>
      )}

      {selectedIds.size >= 2 && (
        <div className="flex items-center justify-between bg-tomato/10 border border-tomato/30 rounded-xl px-3 py-2 mb-3">
          <p className="text-tomato text-xs font-sans">
            {selectedIds.size} tasks selected — combine into one? (Rule 5)
          </p>
          <button
            type="button"
            onClick={handleCombine}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream"
          >
            Combine
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {items.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            Inventory is empty.
          </li>
        )}
        {items.map((item) => (
          <InventoryRow
            key={item.id}
            item={item}
            onSendToToday={onSendToToday}
            removeItem={removeItem}
            toggleDone={toggleDone}
            updateItem={updateItem}
            selected={selectedIds.has(item.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </ul>
    </div>
  )
}

export default Inventory
