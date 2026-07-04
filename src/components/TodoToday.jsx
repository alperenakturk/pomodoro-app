import { useState } from 'react'

// Rule 4: tasks estimated above this should be broken down into sub-tasks.
const MAX_RECOMMENDED_ESTIMATE = 7

const inputClass =
  'bg-cream/5 border border-cream/15 rounded-xl text-cream placeholder:text-sage/50 outline-none focus:border-tomato px-3 py-2 text-sm font-sans'

const ROW_GRID = 'grid grid-cols-[14px_minmax(0,1fr)_26px_26px_26px_16px_16px] gap-1.5 items-center'

function diffOf(task) {
  return task.estimate != null ? task.realized - task.estimate : null
}

function diffClass(diff) {
  if (diff == null) return 'text-sage'
  if (diff > 0) return 'text-tomato'
  if (diff < 0) return 'text-amber'
  return 'text-cream'
}

function TaskRow({ task, isActive, onSelect, onFinish, onRemove }) {
  const diff = diffOf(task)

  return (
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
        {task.estimate > MAX_RECOMMENDED_ESTIMATE && (
          <span
            className="text-tomato ml-1"
            title={`More than ${MAX_RECOMMENDED_ESTIMATE} — break it up (Rule 4)`}
          >
            ⚠
          </span>
        )}
      </span>
      <span className="text-sage text-xs text-right">{task.estimate ?? '-'}</span>
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
  )
}

function TodoToday({ tasks, activeTaskId, setActiveTaskId, addTask, removeTask, finishTask }) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')
  const [type, setType] = useState('')

  // Bölüm ayrımı "urgent"a göre yapılıyor — "unplanned" sadece görevin kökenini
  // (bugün plan dışı çıktığını) belirtir, hangi bölümde görüneceğini değil.
  const planned = tasks.filter((t) => !t.urgent)
  const urgentTasks = tasks.filter((t) => t.urgent)

  function handleAddPlanned(e) {
    e.preventDefault()
    if (!text.trim()) return
    addTask(text.trim(), estimate ? Number(estimate) : null, { type: type.trim() })
    setText('')
    setEstimate('')
    setType('')
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

      <form onSubmit={handleAddPlanned} className="flex gap-2 mb-4 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New task..."
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
          className={`w-32 text-xs ${inputClass}`}
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
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default TodoToday
