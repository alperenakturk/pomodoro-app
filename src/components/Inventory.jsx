import { useState } from 'react'
import { MAX_RECOMMENDED_ESTIMATE, inputClass } from '../lib/constants'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateLocalized } from '../lib/i18n'
import CategoryTagPicker from './CategoryTagPicker'
import CollapseToggle from './CollapseToggle'

function isOverdue(deadline) {
  if (!deadline) return false
  return deadline < new Date().toISOString().slice(0, 10)
}

function CategoryTag({ category }) {
  return (
    <span className="text-sage text-xs bg-cream/5 rounded px-1.5 py-0.5 flex items-center gap-1">
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
  // Deleted/legacy ids just fail to resolve here — no cascading update
  // needed, the task simply drops that tag from display.
  const resolved = categoryIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean)
  if (resolved.length === 0) return null
  return (
    <>
      {resolved.map((category) => (
        <CategoryTag key={category.id} category={category} />
      ))}
    </>
  )
}

function InventoryRow({
  item,
  categories,
  onSendToToday,
  removeItem,
  toggleDone,
  updateItem,
  selected,
  onToggleSelect,
  onManageCategories,
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const [estimate, setEstimate] = useState(item.estimate ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [categoryIds, setCategoryIds] = useState(item.categoryIds ?? [])
  const [deadline, setDeadline] = useState(item.deadline ?? '')
  const [unplanned, setUnplanned] = useState(item.unplanned ?? false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const { t, localeTag } = useTranslation()

  function handleSave() {
    if (!text.trim()) return
    updateItem(item.id, {
      text: text.trim(),
      estimate: estimate === '' ? null : Number(estimate),
      notes: notes.trim(),
      categoryIds,
      deadline: deadline || null,
      unplanned,
    })
    setEditing(false)
  }

  function handleCancel() {
    setText(item.text)
    setEstimate(item.estimate ?? '')
    setNotes(item.notes ?? '')
    setCategoryIds(item.categoryIds ?? [])
    setDeadline(item.deadline ?? '')
    setUnplanned(item.unplanned ?? false)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 font-sans text-sm text-cream border-b border-cream/10 pb-2 last:border-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t('inventory.taskNameAria')}
          className={inputClass}
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder={t('inventory.estimateShortPlaceholder')}
            aria-label={t('inventory.estimateAria')}
            className={`w-16 text-xs ${inputClass}`}
          />
          <CategoryTagPicker
            categories={categories}
            value={categoryIds}
            onAddCategory={onManageCategories}
            onChange={setCategoryIds}
            className="w-36"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label={t('inventory.deadlineAria')}
            className={`text-xs ${inputClass}`}
          />
          <button
            type="button"
            onClick={() => setUnplanned((prev) => !prev)}
            aria-pressed={unplanned}
            title={t('inventory.markUnplannedTitle')}
            className={
              'font-sans text-xs px-3 py-1 rounded-xl border whitespace-nowrap flex-shrink-0 ' +
              (unplanned ? 'bg-amber/20 border-amber/60 text-amber' : 'border-cream/15 text-sage')
            }
          >
            U
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream"
          >
            {t('inventory.saveButton')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
          >
            {t('inventory.cancelButton')}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={
        'flex flex-col gap-1 font-sans text-sm text-cream border-b border-cream/10 pb-2 last:border-0 ' +
        (selected ? 'bg-tomato/10 border-tomato/30 rounded-xl px-2 -mx-2' : '')
      }
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label={t('inventory.selectAria', { text: item.text })}
          title={t('inventory.selectToCombineTitle')}
          className="flex-shrink-0"
        />
        <button
          type="button"
          onClick={() => toggleDone(item.id)}
          className={
            'w-4 h-4 rounded-full border flex-shrink-0 ' +
            (item.done ? 'bg-sage border-sage' : 'border-sage')
          }
          aria-label={t('inventory.markDoneAria')}
        />
        <span className={item.done ? 'flex-1 line-through text-sage' : 'flex-1'}>
          {item.text}
        </span>
        {item.unplanned && (
          <span className="text-amber text-xs font-semibold" title={t('inventory.unplannedBadgeTitle')}>
            U
          </span>
        )}
        <CategoryTags categoryIds={item.categoryIds} categories={categories} />
        {item.notes && (
          <button
            type="button"
            onClick={() => setNotesExpanded((prev) => !prev)}
            className="text-sage text-xs hover:text-cream"
            aria-expanded={notesExpanded}
            title={notesExpanded ? t('common.hideDescription') : t('common.showDescription')}
          >
            {notesExpanded ? '📝▾' : '📝'}
          </button>
        )}
        {item.deadline && (
          <span
            className={
              isOverdue(item.deadline) ? 'text-tomato text-xs font-semibold' : 'text-sage text-xs'
            }
          >
            {formatDateLocalized(item.deadline, localeTag)}
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
                ? t('inventory.moreThanWarningInline', { max: MAX_RECOMMENDED_ESTIMATE })
                : undefined
            }
          >
            {t('reports.pomSuffix', { count: item.estimate })}
            {item.estimate > MAX_RECOMMENDED_ESTIMATE ? ' ⚠' : ''}
          </span>
        )}
        <button
          type="button"
          onClick={() => onSendToToday(item)}
          className="text-tomato text-xs"
        >
          {t('inventory.addToToday')}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-cream"
          aria-label={t('inventory.editAria')}
          title={t('inventory.editTitle')}
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('inventory.deleteConfirm'))) {
              removeItem(item.id)
            }
          }}
          className="text-sage text-xs"
        >
          {t('common.delete')}
        </button>
      </div>
      {notesExpanded && item.notes && (
        <p className="text-sage text-xs whitespace-pre-wrap pl-6">{item.notes}</p>
      )}
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
  categories,
  onManageCategories,
}) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryIds, setCategoryIds] = useState([])
  const [deadline, setDeadline] = useState('')
  const [open, setOpen] = useState(true)
  const [unplanned, setUnplanned] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const { t } = useTranslation()

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCombine() {
    if (window.confirm(t('inventory.combineConfirm', { count: selectedIds.size }))) {
      combineItems([...selectedIds])
      setSelectedIds(new Set())
    }
  }

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    addItem(text.trim(), estimate ? Number(estimate) : null, {
      notes: notes.trim(),
      categoryIds,
      deadline: deadline || null,
      unplanned,
    })
    setText('')
    setEstimate('')
    setNotes('')
    setCategoryIds([])
    setDeadline('')
    setUnplanned(false)
  }

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4 shadow-lg w-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          {t('inventory.title')}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sage text-xs font-sans">{t('inventory.itemsCount', { count: items.length })}</span>
          <CollapseToggle
            open={open}
            onToggle={() => setOpen((prev) => !prev)}
            label={t(open ? 'common.collapseSectionAria' : 'common.expandSectionAria', {
              section: t('inventory.title'),
            })}
          />
        </div>
      </div>

      {open && (
      <>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('inventory.newTaskPlaceholder')}
          aria-label={t('inventory.newTaskAria')}
          className={`flex-1 min-w-0 ${inputClass}`}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="inventory-estimate" className="text-sage text-[10px] font-sans uppercase tracking-wide">
            {t('inventory.estimateLabel')}
          </label>
          <input
            id="inventory-estimate"
            type="number"
            min="1"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder={t('inventory.estimatePlaceholder')}
            className={`w-20 px-2 ${inputClass}`}
          />
        </div>
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream"
        >
          {t('inventory.addButton')}
        </button>
      </form>

      <div className="flex gap-2 mb-2 items-center">
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

      <div className="flex gap-2 mb-4 items-center">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          aria-label={t('inventory.deadlineAria')}
          className={`text-xs ${inputClass}`}
        />
        <button
          type="button"
          onClick={() => setUnplanned((prev) => !prev)}
          aria-pressed={unplanned}
          title={t('inventory.markUnplannedTitle')}
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
          {t('inventory.moreThanWarning', { max: MAX_RECOMMENDED_ESTIMATE })}
        </p>
      )}

      {selectedIds.size >= 2 && (
        <div className="flex items-center justify-between bg-tomato/10 border border-tomato/30 rounded-xl px-3 py-2 mb-3">
          <p className="text-tomato text-xs font-sans">
            {t('inventory.combinePrompt', { count: selectedIds.size })}
          </p>
          <button
            type="button"
            onClick={handleCombine}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream"
          >
            {t('inventory.combineButton')}
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {items.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            {t('inventory.emptyState')}
          </li>
        )}
        {items.map((item) => (
          <InventoryRow
            key={item.id}
            item={item}
            categories={categories}
            onSendToToday={onSendToToday}
            removeItem={removeItem}
            toggleDone={toggleDone}
            updateItem={updateItem}
            selected={selectedIds.has(item.id)}
            onToggleSelect={toggleSelect}
            onManageCategories={onManageCategories}
          />
        ))}
      </ul>
      </>
      )}
    </div>
  )
}

export default Inventory
