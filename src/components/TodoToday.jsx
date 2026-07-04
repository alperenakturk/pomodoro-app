import { useState } from 'react'
import { useTimetable } from '../hooks/useTimetable'
import AvailablePomodoros from './AvailablePomodoros'
import Timetable from './Timetable'

function blockMinutes(block) {
  const [sh, sm] = block.start.split(':').map(Number)
  const [eh, em] = block.end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

// Rule 4: tasks estimated above this should be broken down into sub-tasks.
const MAX_RECOMMENDED_ESTIMATE = 7

const inputClass =
  'bg-cream/5 border border-cream/15 rounded-xl text-cream placeholder:text-sage/50 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-3 py-2 text-sm font-sans'

const ROW_GRID = 'grid grid-cols-[14px_minmax(0,1fr)_26px_26px_26px_16px_16px_16px] gap-1.5 items-center'

function diffOf(task) {
  return task.estimate != null ? task.realized - task.estimate : null
}

function diffClass(diff) {
  if (diff == null) return 'text-sage'
  if (diff > 0) return 'text-tomato'
  if (diff < 0) return 'text-amber'
  return 'text-cream'
}

function TaskRow({ task, isActive, onSelect, onFinish, onRemove, onUpdate, onReestimate }) {
  const diff = diffOf(task)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const [estimate, setEstimate] = useState(task.estimate ?? '')
  const [type, setType] = useState(task.type ?? '')
  const [reestimating, setReestimating] = useState(false)
  const [reestimateValue, setReestimateValue] = useState('')

  function handleSave() {
    if (!text.trim()) return
    onUpdate(task.id, {
      text: text.trim(),
      estimate: estimate === '' ? null : Number(estimate),
      type: type.trim(),
    })
    setEditing(false)
  }

  function handleCancel() {
    setText(task.text)
    setEstimate(task.estimate ?? '')
    setType(task.type ?? '')
    setEditing(false)
  }

  function openReestimate() {
    const current = task.reestimate2 ?? task.reestimate1 ?? task.estimate
    setReestimateValue(current != null ? String(current) : '')
    setReestimating(true)
  }

  function submitReestimate(e) {
    e.preventDefault()
    const value = Number(reestimateValue)
    if (!Number.isFinite(value) || value <= 0) return
    onReestimate(task.id, value)
    setReestimating(false)
  }

  if (editing) {
    return (
      <li className={`font-sans text-sm rounded-xl px-2 py-2 flex flex-col gap-2 ${isActive ? 'bg-tomato/10' : ''}`}>
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
            className={`w-28 text-xs ${inputClass}`}
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
    <>
    <li className={`${ROW_GRID} font-sans text-sm rounded-xl px-2 py-2 ${isActive ? 'bg-tomato/10' : ''}`}>
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className={
          'w-4 h-4 rounded-full border flex-shrink-0 ' +
          (isActive ? 'bg-tomato border-tomato' : 'border-sage')
        }
        aria-label="make active task"
      />
      <span
        title={task.text}
        className={`truncate ${task.done ? 'line-through text-sage' : 'text-cream'}`}
      >
        {task.text}
        {task.unplanned && (
          <span className="text-amber text-xs font-semibold ml-1" title="Unplanned">
            U
          </span>
        )}
        {task.type && (
          <span className="text-sage text-xs bg-cream/5 rounded px-1 ml-1">{task.type}</span>
        )}
        {task.pairWith && (
          <span
            className="text-sage text-xs bg-cream/5 rounded px-1 ml-1"
            title="No real-time sync — just a note of who you're working with"
          >
            with {task.pairWith}
          </span>
        )}
        {task.estimate > MAX_RECOMMENDED_ESTIMATE && (
          <span
            className="text-tomato ml-1"
            title={`More than ${MAX_RECOMMENDED_ESTIMATE} — break it up (Rule 4)`}
          >
            ⚠
          </span>
        )}
      </span>
      {task.done ? (
        <span className="text-sage text-xs text-right">{task.estimate ?? '-'}</span>
      ) : (
        <button
          type="button"
          onClick={openReestimate}
          className="text-sage text-xs text-right hover:text-tomato"
          aria-label="re-estimate task"
          title={
            task.reestimate1 != null
              ? `Re-estimated: ${task.estimate ?? '?'} → ${task.reestimate1}${
                  task.reestimate2 != null ? ` → ${task.reestimate2}` : ''
                }. Click to re-estimate again.`
              : 'Running long? Click to re-estimate.'
          }
        >
          {task.estimate ?? '-'}
          {task.reestimate1 != null && <span className="text-tomato">↻</span>}
        </button>
      )}
      <span className="text-sage text-xs text-right">{task.realized}</span>
      <span className={`text-xs text-right ${diffClass(diff)}`}>
        {diff == null ? '-' : `${diff > 0 ? '+' : ''}${diff}`}
      </span>
      {!task.done && (
        <button
          type="button"
          onClick={() => onFinish(task.id)}
          className="text-tomato text-xs leading-none"
          title="Finish task"
          aria-label="finish task"
        >
          ✓
        </button>
      )}
      {task.done && <span />}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-cream text-xs leading-none"
        title="Edit task"
        aria-label="edit task"
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Delete this task?')) {
            onRemove(task.id)
          }
        }}
        className="text-sage text-xs leading-none"
        title="Delete task"
        aria-label="delete task"
      >
        ✕
      </button>
    </li>
    {reestimating && (
      <li className="flex items-center gap-2 px-2 py-2 -mt-1 mb-1 bg-tomato/5 border border-tomato/20 rounded-xl">
        <form onSubmit={submitReestimate} className="flex items-center gap-2 flex-1 flex-wrap">
          <span className="text-sage text-xs">Re-estimate "{task.text}":</span>
          <input
            type="number"
            min="1"
            autoFocus
            value={reestimateValue}
            onChange={(e) => setReestimateValue(e.target.value)}
            aria-label="New estimate"
            className={`w-16 text-xs ${inputClass}`}
          />
          <button
            type="submit"
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setReestimating(false)}
            className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
          >
            Cancel
          </button>
        </form>
      </li>
    )}
    </>
  )
}

function TodoToday({
  tasks,
  activeTaskId,
  setActiveTaskId,
  addTask,
  removeTask,
  updateTask,
  reestimateTask,
  finishTask,
}) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')
  const [type, setType] = useState('')
  const [pairWith, setPairWith] = useState('')

  // Bölüm ayrımı "urgent"a göre yapılıyor — "unplanned" sadece görevin kökenini
  // (bugün plan dışı çıktığını) belirtir, hangi bölümde görüneceğini değil.
  const planned = tasks.filter((t) => !t.urgent)
  const urgentTasks = tasks.filter((t) => t.urgent)
  const plannedTotal = tasks.reduce((sum, t) => sum + (t.estimate || 0), 0)

  const timetable = useTimetable()
  const timetableHours =
    timetable.blocks.reduce((sum, b) => sum + blockMinutes(b), 0) / 60

  function handleAddPlanned(e) {
    e.preventDefault()
    if (!text.trim()) return
    addTask(text.trim(), estimate ? Number(estimate) : null, {
      type: type.trim(),
      pairWith: pairWith.trim(),
    })
    setText('')
    setEstimate('')
    setType('')
    setPairWith('')
  }

  function handleAddUnplanned(e) {
    e.preventDefault()
    const value = e.target.elements.unplannedText.value.trim()
    if (!value) return
    addTask(value, null, { unplanned: true, urgent: true })
    e.target.reset()
  }

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
      <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-4">
        Today's Tasks
      </p>

      <AvailablePomodoros plannedTotal={plannedTotal} suggestedHours={timetableHours} />
      <Timetable
        blocks={timetable.blocks}
        addBlock={timetable.addBlock}
        removeBlock={timetable.removeBlock}
      />

      <form onSubmit={handleAddPlanned} className="flex gap-2 mb-4 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New task..."
          aria-label="New task"
          className={`flex-1 min-w-0 ${inputClass}`}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="today-estimate" className="text-sage text-[10px] font-sans uppercase tracking-wide">
            Est.
          </label>
          <input
            id="today-estimate"
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

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Category (optional)"
          aria-label="Category (optional)"
          className={`w-32 text-xs ${inputClass}`}
        />
        <input
          type="text"
          value={pairWith}
          onChange={(e) => setPairWith(e.target.value)}
          placeholder="Pairing with (optional)"
          aria-label="Pairing with (optional)"
          title="No real-time sync — just a note of who you're working with"
          className={`w-36 text-xs ${inputClass}`}
        />
      </div>

      {Number(estimate) > MAX_RECOMMENDED_ESTIMATE && (
        <p className="text-tomato text-xs font-sans mb-4 -mt-2">
          More than {MAX_RECOMMENDED_ESTIMATE} pomodoros — break the task into sub-tasks (Rule 4).
        </p>
      )}

      <div className={`${ROW_GRID} px-2 mb-1`}>
        <span />
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide">Task</span>
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide text-right">Est.</span>
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide text-right">Real</span>
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide text-right">Diff</span>
        <span />
        <span />
        <span />
      </div>

      <ul className="flex flex-col gap-1 mb-4">
        {planned.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            No tasks yet.
          </li>
        )}
        {planned.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isActive={task.id === activeTaskId}
            onSelect={setActiveTaskId}
            onFinish={finishTask}
            onRemove={removeTask}
            onUpdate={updateTask}
            onReestimate={reestimateTask}
          />
        ))}
      </ul>

      <div className="bg-tomato/5 border border-tomato/20 rounded-2xl p-3">
        <p className="flex items-center gap-2 text-tomato text-xs font-sans uppercase tracking-wide mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-tomato" />
          Unplanned &amp; Urgent
        </p>
        <form onSubmit={handleAddUnplanned} className="flex gap-2 mb-2">
          <input
            name="unplannedText"
            type="text"
            placeholder="Sudden task..."
            aria-label="Sudden task"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            className="font-sans text-sm px-4 py-2 rounded-xl border border-cream/20 text-cream"
          >
            Add
          </button>
        </form>
        <ul className="flex flex-col gap-1">
          {urgentTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isActive={task.id === activeTaskId}
              onSelect={setActiveTaskId}
              onFinish={finishTask}
              onRemove={removeTask}
              onUpdate={updateTask}
              onReestimate={reestimateTask}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default TodoToday
