import { useState, useEffect, useRef } from 'react'

// A dropdown for picking a task's category, modeled after Select.jsx's
// from-scratch pattern (native <option> popups ignore author background
// color in Chromium — see Select.jsx) but extended with a leading color dot
// per option, which the generic Select.jsx has no slot for. Kept as its own
// component rather than changing Select.jsx, since that one's still used
// as-is for the Settings sound picker.
//
// value is one of: a category id, `null` ("no category" — a task explicitly
// has none), or `undefined` (only meaningful when allowAll is set — "don't
// filter by category at all"). Those last two must stay distinct: in
// RecordsLog's filter, `null` means "show only uncategorized records" while
// "no filter" needs its own value, or picking "No category" there would be
// indistinguishable from not having filtered at all.
function Dot({ color }) {
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0 border border-cream/20"
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}

function CategorySelect({
  id,
  categories,
  value,
  onChange,
  className = '',
  allowAll = false,
  allLabel = 'All categories',
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

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

  const isAll = allowAll && value === undefined
  const selected = !isAll ? categories.find((c) => c.id === value) : null

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full bg-cream/5 border border-cream/15 rounded-lg text-cream px-2 py-1.5 text-xs flex items-center gap-1.5 focus:border-tomato focus:ring-2 focus:ring-tomato/40 outline-none"
      >
        {!isAll && <Dot color={selected?.color} />}
        <span className="truncate">{isAll ? allLabel : selected ? selected.name : 'No category'}</span>
        <span className="text-sage text-[10px] ml-auto">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 top-full mt-1 z-10 bg-pine border border-cream/15 rounded-lg shadow-lg overflow-hidden min-w-full max-h-48 overflow-y-auto"
        >
          {allowAll && (
            <li role="option" aria-selected={isAll}>
              <button
                type="button"
                onClick={() => {
                  onChange(undefined)
                  setOpen(false)
                }}
                className={`w-full text-left px-2 py-1.5 text-xs whitespace-nowrap ${
                  isAll ? 'bg-tomato/20 text-tomato' : 'text-cream hover:bg-cream/10'
                }`}
              >
                {allLabel}
              </button>
            </li>
          )}
          <li role="option" aria-selected={!isAll && value == null}>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={`w-full text-left px-2 py-1.5 text-xs whitespace-nowrap flex items-center gap-1.5 ${
                !isAll && value == null ? 'bg-tomato/20 text-tomato' : 'text-cream hover:bg-cream/10'
              }`}
            >
              <Dot color={null} />
              No category
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id} role="option" aria-selected={category.id === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(category.id)
                  setOpen(false)
                }}
                className={`w-full text-left px-2 py-1.5 text-xs whitespace-nowrap flex items-center gap-1.5 ${
                  category.id === value ? 'bg-tomato/20 text-tomato' : 'text-cream hover:bg-cream/10'
                }`}
              >
                <Dot color={category.color} />
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CategorySelect
