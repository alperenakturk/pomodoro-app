import { useState, useEffect, useRef, memo } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { MAX_RECOMMENDED_ESTIMATE, inputClass } from '../lib/constants'
import { diffClass, diffLabel } from '../lib/diffHelpers'
import UnplannedCapture from './UnplannedCapture'
import CategoryTagPicker from './CategoryTagPicker'
import { CategoryTags } from './CategoryTag'

// This row's own category-tag styling (padding/margin/inline-flex) — passed
// to the shared CategoryTags below so this list keeps rendering pixel-
// identical tags to before CategoryTag.jsx existed. See CategoryTag.jsx's
// own comment for why this isn't a shared default.
const CATEGORY_TAG_CLASS = 'text-sage text-xs bg-cream/5 rounded px-1 ml-1 inline-flex items-center gap-1'

// The three 40px columns hold the estimate/real/diff header labels and
// values — sized for the Turkish header text ("Tahmin"/"Gerçek"/"Fark"),
// which is wider than the English ("Est."/"Real"/"Diff") that used to size
// this at 26px. Each row (including the header row above the list) renders
// as its own independent grid container rather than a shared CSS grid/table,
// so column widths can't auto-align across rows via intrinsic sizing (e.g.
// `max-content`) — only matching fixed pixel widths keep the header and
// every row's cells lined up. Fixed widths also mean any text wider than
// its column isn't clipped, just overflows into the neighbor — which is
// exactly what was happening with the Turkish labels at 26px.
const ROW_GRID = 'grid grid-cols-[14px_minmax(0,1fr)_40px_40px_40px_16px_16px_16px] gap-1.5 items-center'

function diffOf(task) {
  return task.estimate != null ? task.realized - task.estimate : null
}

function TaskRow({
  task,
  categories,
  isActive,
  onSelect,
  onFinish,
  onRemove,
  onUpdate,
  onReestimate,
  onManageCategories,
}) {
  const diff = diffOf(task)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const [estimate, setEstimate] = useState(task.estimate ?? '')
  const [categoryIds, setCategoryIds] = useState(task.categoryIds ?? [])
  const [notes, setNotes] = useState(task.notes ?? '')
  const [reestimating, setReestimating] = useState(false)
  const [reestimateValue, setReestimateValue] = useState('')
  const [notesExpanded, setNotesExpanded] = useState(false)
  const { t } = useTranslation()

  function handleSave() {
    if (!text.trim()) return
    onUpdate(task.id, {
      text: text.trim(),
      estimate: estimate === '' ? null : Number(estimate),
      categoryIds,
      notes: notes.trim(),
    })
    setEditing(false)
  }

  function handleCancel() {
    setText(task.text)
    setEstimate(task.estimate ?? '')
    setCategoryIds(task.categoryIds ?? [])
    setNotes(task.notes ?? '')
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
    const applied = onReestimate(task.id, value)
    if (applied === false) {
      window.alert(t('today.alreadyTwoReestimates'))
      return
    }
    setReestimating(false)
  }

  if (editing) {
    return (
      <li className={`font-sans text-sm rounded-xl px-2 py-2 flex flex-col gap-2 ${isActive ? 'bg-tomato/10' : ''}`}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t('today.taskNameAria')}
          className={inputClass}
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder={t('today.estimateShortPlaceholder')}
            aria-label={t('today.estimateAria')}
            className={`w-16 text-xs ${inputClass}`}
          />
          <CategoryTagPicker
            categories={categories}
            value={categoryIds}
            onChange={setCategoryIds}
            onAddCategory={onManageCategories}
            className="w-36"
          />
          <button
            type="button"
            onClick={handleSave}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-on-tomato ml-auto"
          >
            {t('today.saveButton')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
          >
            {t('today.cancelButton')}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('common.descriptionPlaceholder')}
          aria-label={t('common.descriptionAria')}
          rows={3}
          className={`text-xs resize-y ${inputClass}`}
        />
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
        aria-label={t('today.makeActiveAria')}
      />
      <span
        title={task.text}
        className={`truncate ${task.done ? 'text-sage' : 'text-cream'}`}
      >
        <span className="relative inline-block">
          {task.text}
          {task.done && <span aria-hidden="true" className="task-strike" />}
        </span>
        {task.unplanned && (
          <span className="text-amber-text text-xs font-semibold ml-1" title={t('today.unplannedBadgeTitle')}>
            U
          </span>
        )}
        <CategoryTags categoryIds={task.categoryIds} categories={categories} tagClassName={CATEGORY_TAG_CLASS} />
        {task.notes && (
          <button
            type="button"
            onClick={() => setNotesExpanded((prev) => !prev)}
            className="text-sage text-xs ml-1 hover:text-cream"
            aria-expanded={notesExpanded}
            title={notesExpanded ? t('common.hideDescription') : t('common.showDescription')}
          >
            {notesExpanded ? '📝▾' : '📝'}
          </button>
        )}
        {task.estimate > MAX_RECOMMENDED_ESTIMATE && (
          <span
            className="text-tomato-text ml-1"
            title={t('today.moreThanWarningInline', { max: MAX_RECOMMENDED_ESTIMATE })}
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
          className="text-sage text-xs text-right hover:text-tomato-text"
          aria-label={t('today.reestimateAria')}
          title={
            task.reestimate1 != null
              ? t('today.reestimateTitleAgain', {
                  from: task.estimate ?? '?',
                  to: task.reestimate1,
                  extra: task.reestimate2 != null ? ` → ${task.reestimate2}` : '',
                })
              : t('today.reestimateTitleRunningLong')
          }
        >
          {task.estimate ?? '-'}
          {task.reestimate1 != null && <span className="text-tomato-text">↻</span>}
        </button>
      )}
      <span className="text-sage text-xs text-right">{task.realized}</span>
      <span className={`text-xs text-right ${diffClass(diff)}`}>{diffLabel(diff)}</span>
      {!task.done && (
        <button
          type="button"
          onClick={() => onFinish(task.id)}
          className="text-tomato-text text-xs leading-none"
          title={t('today.finishTaskTitle')}
          aria-label={t('today.finishTaskAria')}
        >
          ✓
        </button>
      )}
      {task.done && (
        <span className="text-tomato-text text-xs leading-none animate-task-check" aria-hidden="true">
          ✓
        </span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-cream text-xs leading-none"
        title={t('today.editTaskTitle')}
        aria-label={t('today.editTaskAria')}
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(t('today.deleteConfirm'))) {
            onRemove(task.id)
          }
        }}
        className="text-sage text-xs leading-none"
        title={t('today.deleteTaskTitle')}
        aria-label={t('today.deleteTaskAria')}
      >
        ✕
      </button>
    </li>
    {notesExpanded && task.notes && (
      <li className="px-2 pb-2 -mt-1">
        <p className="text-sage text-xs whitespace-pre-wrap pl-6">{task.notes}</p>
      </li>
    )}
    {reestimating && (
      <li className="flex items-center gap-2 px-2 py-2 -mt-1 mb-1 bg-tomato/5 border border-tomato/20 rounded-xl">
        <form onSubmit={submitReestimate} className="flex items-center gap-2 flex-1 flex-wrap">
          <span className="text-sage text-xs">{t('today.reestimatePrompt', { text: task.text })}</span>
          <input
            type="number"
            min="1"
            autoFocus
            value={reestimateValue}
            onChange={(e) => setReestimateValue(e.target.value)}
            aria-label={t('today.newEstimateAria')}
            className={`w-16 text-xs ${inputClass}`}
          />
          <button
            type="submit"
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-on-tomato"
          >
            {t('today.saveButton')}
          </button>
          <button
            type="button"
            onClick={() => setReestimating(false)}
            className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
          >
            {t('today.cancelButton')}
          </button>
        </form>
      </li>
    )}
    </>
  )
}

// The "..." bulk-actions menu next to Today's Tasks' header. Same click-
// outside/Escape dropdown pattern as Select.jsx/ProfileMenu.jsx. Each action
// is disabled (not hidden) when it wouldn't do anything, and both still go
// through the app's usual confirm() gate before touching data.
function TaskListMenu({ hasFinished, hasAny, onClearFinished, onClearAll }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleClearFinished() {
    setOpen(false)
    if (window.confirm(t('today.clearFinishedConfirm'))) onClearFinished()
  }

  function handleClearAll() {
    setOpen(false)
    if (window.confirm(t('today.clearAllConfirm'))) onClearAll()
  }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('today.bulkActionsAria')}
        title={t('today.bulkActionsAria')}
        className="text-sage hover:text-cream text-sm leading-none px-1"
      >
        •••
      </button>

      {open && (
        <ul
          role="menu"
          aria-label={t('today.bulkActionsAria')}
          className="absolute right-0 top-full mt-1 z-20 bg-pine border border-cream/15 rounded-lg shadow-lg overflow-hidden min-w-[12rem]"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={handleClearFinished}
              disabled={!hasFinished}
              className="w-full text-left px-3 py-2 text-xs font-sans text-cream hover:bg-cream/10 whitespace-nowrap disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {t('today.clearFinishedLabel')}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={handleClearAll}
              disabled={!hasAny}
              className="w-full text-left px-3 py-2 text-xs font-sans text-tomato-text hover:bg-tomato/10 whitespace-nowrap disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {t('today.clearAllLabel')}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

function TodoToday({
  tasks,
  activeTaskId,
  setActiveTaskId,
  addTask,
  removeTask,
  clearFinishedTasks,
  clearAllTasks,
  updateTask,
  reestimateTask,
  finishTask,
  categories,
  onManageCategories,
}) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')
  const [categoryIds, setCategoryIds] = useState([])
  const [notes, setNotes] = useState('')
  const { t } = useTranslation()

  // Bölüm ayrımı "urgent"a göre yapılıyor — "unplanned" sadece görevin kökenini
  // (bugün plan dışı çıktığını) belirtir, hangi bölümde görüneceğini değil.
  const planned = tasks.filter((t) => !t.urgent)
  const urgentTasks = tasks.filter((t) => t.urgent)

  function handleAddPlanned(e) {
    e.preventDefault()
    if (!text.trim()) return
    addTask(text.trim(), estimate ? Number(estimate) : null, {
      categoryIds,
      notes: notes.trim(),
    })
    setText('')
    setEstimate('')
    setCategoryIds([])
    setNotes('')
  }

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          {t('today.title')}
        </p>
        <TaskListMenu
          hasFinished={tasks.some((task) => task.done)}
          hasAny={tasks.length > 0}
          onClearFinished={clearFinishedTasks}
          onClearAll={clearAllTasks}
        />
      </div>

      <form onSubmit={handleAddPlanned} className="flex gap-2 mb-4 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('today.newTaskPlaceholder')}
          aria-label={t('today.newTaskAria')}
          className={`flex-1 min-w-0 ${inputClass}`}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="today-estimate" className="text-sage text-[10px] font-sans uppercase tracking-wide">
            {t('today.estimateLabel')}
          </label>
          <input
            id="today-estimate"
            type="number"
            min="1"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder={t('today.estimatePlaceholder')}
            className={`w-20 px-2 ${inputClass}`}
          />
        </div>
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-on-tomato"
        >
          {t('today.addButton')}
        </button>
      </form>

      <div className="flex gap-2 mb-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('common.descriptionPlaceholder')}
          aria-label={t('common.descriptionAria')}
          rows={2}
          className={`flex-1 text-xs resize-y ${inputClass}`}
        />
        <CategoryTagPicker
          categories={categories}
          value={categoryIds}
          onChange={setCategoryIds}
          onAddCategory={onManageCategories}
          className="w-36"
        />
      </div>

      {Number(estimate) > MAX_RECOMMENDED_ESTIMATE && (
        <p className="text-tomato-text text-xs font-sans mb-4 -mt-2">
          {t('today.moreThanWarning', { max: MAX_RECOMMENDED_ESTIMATE })}
        </p>
      )}

      <div className={`${ROW_GRID} px-2 mb-1`}>
        <span />
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide">{t('today.colTask')}</span>
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide text-right">{t('today.colEstimate')}</span>
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide text-right">{t('today.colReal')}</span>
        <span className="text-sage text-[10px] font-sans uppercase tracking-wide text-right">{t('today.colDiff')}</span>
        <span />
        <span />
        <span />
      </div>

      <ul className="flex flex-col gap-1 mb-4">
        {planned.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            {t('today.emptyState')}
          </li>
        )}
        {planned.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            categories={categories}
            isActive={task.id === activeTaskId}
            onSelect={setActiveTaskId}
            onFinish={finishTask}
            onRemove={removeTask}
            onUpdate={updateTask}
            onReestimate={reestimateTask}
            onManageCategories={onManageCategories}
          />
        ))}
      </ul>

      <div className="bg-tomato/5 border border-tomato/20 rounded-2xl p-3">
        <p className="flex items-center gap-2 text-tomato text-xs font-sans uppercase tracking-wide mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-tomato" />
          {t('today.unplannedUrgentTitle')}
        </p>
        <UnplannedCapture addTask={addTask} className="mb-2" />
        <ul className="flex flex-col gap-1">
          {urgentTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              categories={categories}
              isActive={task.id === activeTaskId}
              onSelect={setActiveTaskId}
              onFinish={finishTask}
              onRemove={removeTask}
              onUpdate={updateTask}
              onReestimate={reestimateTask}
              onManageCategories={onManageCategories}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

// Memoized — see Inventory.jsx's identical note. Relies on App.jsx
// useCallback-wrapping finishTask/onManageCategories so this doesn't get a
// fresh prop identity (and re-render its whole task list) every second.
export default memo(TodoToday)
