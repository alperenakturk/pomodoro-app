import { useState } from 'react'

// Rule 4: tasks estimated above this should be broken down into sub-tasks.
const MAX_RECOMMENDED_ESTIMATE = 7

function EstimateBoxes({ estimate, realized }) {
  if (!estimate) {
    return <span className="text-sage text-xs">{realized} pom.</span>
  }
  const total = Math.max(estimate, realized)
  const boxes = Array.from({ length: total }, (_, i) => i < realized)
  return (
    <span className="flex gap-1">
      {boxes.map((filled, i) => (
        <span
          key={i}
          className={
            'w-3 h-3 rounded-sm border ' +
            (filled ? 'bg-tomato border-tomato' : 'border-sage/50')
          }
        />
      ))}
    </span>
  )
}

function TaskRow({ task, isActive, onSelect, onFinish, onRemove }) {
  return (
    <li
      className={
        'flex items-center gap-2 font-sans text-sm rounded-xl px-2 py-2 ' +
        (isActive ? 'bg-tomato/10' : '')
      }
    >
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className={
          'w-4 h-4 rounded-full border flex-shrink-0 ' +
          (isActive ? 'bg-tomato border-tomato' : 'border-sage')
        }
        aria-label="aktif görev yap"
      />
      <span className={task.done ? 'line-through text-sage flex-1' : 'flex-1 text-ink'}>
        {task.text}
        {task.estimate > MAX_RECOMMENDED_ESTIMATE && (
          <span
            className="text-tomato ml-1"
            title={`${MAX_RECOMMENDED_ESTIMATE}'den fazla — böl (Rule 4)`}
          >
            ⚠
          </span>
        )}
      </span>
      <EstimateBoxes estimate={task.estimate} realized={task.realized} />
      {!task.done && (
        <button
          type="button"
          onClick={() => onFinish(task.id)}
          className="text-tomato text-xs"
        >
          Bitir
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(task.id)}
        className="text-sage text-xs"
      >
        Sil
      </button>
    </li>
  )
}

function TodoToday({ tasks, activeTaskId, setActiveTaskId, addTask, removeTask, finishTask }) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')

  const planned = tasks.filter((t) => !t.unplanned)
  const unplanned = tasks.filter((t) => t.unplanned)

  function handleAddPlanned(e) {
    e.preventDefault()
    if (!text.trim()) return
    addTask(text.trim(), estimate ? Number(estimate) : null)
    setText('')
    setEstimate('')
  }

  function handleAddUnplanned(e) {
    e.preventDefault()
    const value = e.target.elements.unplannedText.value.trim()
    if (!value) return
    addTask(value, null, { unplanned: true })
    e.target.reset()
  }

  return (
    <div className="bg-cream rounded-3xl px-6 py-6 shadow-xl w-full h-full">
      <p className="font-display text-tomato text-xs tracking-widest uppercase mb-4">
        Bugünün görevleri
      </p>

      <form onSubmit={handleAddPlanned} className="flex gap-2 mb-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Yeni görev..."
          className="flex-1 font-sans text-sm px-3 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <input
          type="number"
          min="1"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="pom."
          className="w-16 font-sans text-sm px-2 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream"
        >
          Ekle
        </button>
      </form>

      {Number(estimate) > MAX_RECOMMENDED_ESTIMATE && (
        <p className="text-tomato text-xs font-sans mb-4 -mt-2">
          {MAX_RECOMMENDED_ESTIMATE}'den fazla pomodoro — görevi alt görevlere böl (Rule 4).
        </p>
      )}

      <ul className="flex flex-col gap-1 mb-4">
        {planned.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            Henüz görev yok.
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

      <p className="text-sage text-xs font-sans uppercase tracking-wide mb-2">
        Plansız ve acil
      </p>
      <form onSubmit={handleAddUnplanned} className="flex gap-2 mb-2">
        <input
          name="unplannedText"
          type="text"
          placeholder="Aniden çıkan iş..."
          className="flex-1 font-sans text-sm px-3 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl border border-sage text-ink"
        >
          Ekle
        </button>
      </form>
      <ul className="flex flex-col gap-1">
        {unplanned.map((task) => (
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
  )
}

export default TodoToday
