import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { Dot } from './CategoryTag'

// Multi-select category picker (tags) for assigning categories to a task —
// distinct from CategorySelect, which is a single-pick dropdown still used
// for Records Log's category filter (filtering by one category at a time
// stays simple; assigning multiple categories to a task does not).

function CategoryTagPicker({ id, categories, value, onChange, onAddCategory, className = '' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
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

  const selected = categories.filter((c) => value.includes(c.id))

  function toggle(categoryId) {
    onChange(
      value.includes(categoryId) ? value.filter((v) => v !== categoryId) : [...value, categoryId]
    )
  }

  // Opens Settings > Data (see App.jsx's openCategoryManager) — a user
  // assigning categories to a task shouldn't have to go find where
  // categories are managed on their own.
  function handleAddCategory() {
    setOpen(false)
    onAddCategory()
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-h-[30px] bg-cream/5 border border-cream/15 rounded-lg text-cream px-2 py-1 text-xs flex items-center gap-1 flex-wrap focus:border-tomato focus:ring-2 focus:ring-tomato/40 outline-none"
      >
        {selected.length === 0 ? (
          <span className="text-sage">{t('categoryPicker.noneSelected')}</span>
        ) : (
          selected.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 bg-cream/10 rounded px-1 py-0.5"
            >
              <Dot color={c.color} />
              {c.name}
            </span>
          ))
        )}
        <span className="text-sage text-[10px] ml-auto">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={id}
          className="absolute left-0 top-full mt-1 z-10 bg-pine border border-cream/15 rounded-lg shadow-lg overflow-hidden min-w-full max-h-48 overflow-y-auto"
        >
          {categories.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-sage whitespace-nowrap">{t('categoryPicker.noneYet')}</li>
          )}
          {categories.map((category) => {
            const isSelected = value.includes(category.id)
            return (
              <li key={category.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => toggle(category.id)}
                  className={`w-full text-left px-2 py-1.5 text-xs whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected ? 'bg-tomato/20 text-tomato' : 'text-cream hover:bg-cream/10'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center leading-none ${
                      isSelected ? 'border-tomato bg-tomato/40' : 'border-cream/30'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && '✓'}
                  </span>
                  <Dot color={category.color} />
                  {category.name}
                </button>
              </li>
            )
          })}
          {onAddCategory && (
            <li role="option" aria-selected={false} className="border-t border-cream/10">
              <button
                type="button"
                onClick={handleAddCategory}
                className="w-full text-left px-2 py-1.5 text-xs whitespace-nowrap text-tomato-text hover:bg-cream/10"
              >
                + {t('categoryPicker.addCategory')}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default CategoryTagPicker
