import { useState } from 'react'
import { CATEGORY_COLORS, inputClass } from '../lib/constants'
import { useTranslation } from '../hooks/useTranslation'

function ColorSwatchPicker({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          aria-label={t(`categoryColors.${c.key}`)}
          aria-pressed={value === c.value}
          title={t(`categoryColors.${c.key}`)}
          className={`w-5 h-5 rounded-full border-2 ${value === c.value ? 'border-cream' : 'border-transparent'}`}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  )
}

function CategoryRow({ category, updateCategory, removeCategory }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const { t } = useTranslation()

  function handleSave() {
    if (!name.trim()) return
    updateCategory(category.id, { name: name.trim(), color })
    setEditing(false)
  }

  function handleCancel() {
    setName(category.name)
    setColor(category.color)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-2 border-b border-cream/10 last:border-b-0">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={t('categoryManager.categoryNameAria')}
          className={`text-xs ${inputClass}`}
        />
        <ColorSwatchPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-on-tomato"
          >
            {t('categoryManager.saveButton')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
          >
            {t('categoryManager.cancelButton')}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 py-2 border-b border-cream/10 last:border-b-0 text-xs font-sans">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <span className="text-cream flex-1 truncate">{category.name}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-cream"
        aria-label={t('categoryManager.editAria', { name: category.name })}
        title={t('categoryManager.editTitle')}
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(t('categoryManager.deleteConfirm', { name: category.name }))) {
            removeCategory(category.id)
          }
        }}
        className="text-sage"
        aria-label={t('categoryManager.deleteAria', { name: category.name })}
        title={t('categoryManager.deleteTitle')}
      >
        ✕
      </button>
    </li>
  )
}

// `canCreateCategories`/`onRequireSignIn` gate NEW category creation to
// signed-in accounts only (a deliberate product decision, not a bug fix —
// see CLAUDE.md/the task this came from). Guests keep full use of whatever
// categories already exist: assign/edit/delete all still work unrestricted
// below, unaffected by either prop — only the add-form at the top swaps for
// a sign-up prompt. Both props default so this component stays renderable
// on its own (e.g. in tests) without every caller having to pass them.
function CategoryManager({
  categories,
  addCategory,
  updateCategory,
  removeCategory,
  canCreateCategories = true,
  onRequireSignIn = () => {},
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0].value)
  const { t } = useTranslation()

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addCategory(name, color)
    setName('')
    setColor(CATEGORY_COLORS[0].value)
  }

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full mt-6">
      <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-4">
        {t('categoryManager.title')}
      </p>

      {canCreateCategories ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('categoryManager.newCategoryPlaceholder')}
            aria-label={t('categoryManager.newCategoryAria')}
            className={`text-xs ${inputClass}`}
          />
          <div className="flex items-center justify-between gap-2">
            <ColorSwatchPicker value={color} onChange={setColor} />
            <button
              type="submit"
              className="font-sans text-xs px-4 py-2 rounded-xl bg-tomato text-on-tomato flex-shrink-0"
            >
              {t('categoryManager.addButton')}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 mb-4 flex flex-col gap-2">
          <p className="text-sage text-xs font-sans">{t('categoryManager.signUpToCreateHint')}</p>
          <button
            type="button"
            onClick={onRequireSignIn}
            className="font-sans text-xs px-3 py-1.5 rounded-lg bg-tomato text-on-tomato self-start"
          >
            {t('auth.signUpButton')}
          </button>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sage text-xs font-sans text-center py-2">
          {t('categoryManager.emptyState')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              updateCategory={updateCategory}
              removeCategory={removeCategory}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default CategoryManager
