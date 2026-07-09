import { useState } from 'react'
import { CATEGORY_COLORS, inputClass } from '../lib/constants'

function ColorSwatchPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          aria-label={c.name}
          aria-pressed={value === c.value}
          title={c.name}
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
          aria-label="Category name"
          className={`text-xs ${inputClass}`}
        />
        <ColorSwatchPicker value={color} onChange={setColor} />
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
        aria-label={`edit ${category.name}`}
        title="Edit"
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              `Delete category "${category.name}"? Tasks and records using it will show as uncategorized.`
            )
          ) {
            removeCategory(category.id)
          }
        }}
        className="text-sage"
        aria-label={`delete ${category.name}`}
        title="Delete"
      >
        ✕
      </button>
    </li>
  )
}

function CategoryManager({ categories, addCategory, updateCategory, removeCategory }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0].value)

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addCategory(name, color)
    setName('')
    setColor(CATEGORY_COLORS[0].value)
  }

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full mt-6">
      <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-4">
        Categories
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category..."
          aria-label="New category name"
          className={`text-xs ${inputClass}`}
        />
        <div className="flex items-center justify-between gap-2">
          <ColorSwatchPicker value={color} onChange={setColor} />
          <button
            type="submit"
            className="font-sans text-xs px-4 py-2 rounded-xl bg-tomato text-cream flex-shrink-0"
          >
            Add
          </button>
        </div>
      </form>

      {categories.length === 0 ? (
        <p className="text-sage text-xs font-sans text-center py-2">
          No categories yet — tasks will show as uncategorized.
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
