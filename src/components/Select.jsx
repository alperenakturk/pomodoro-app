import { useState, useEffect, useRef } from 'react'

// A from-scratch dropdown instead of a native <select>. Native <option>
// popups largely ignore author background-color in Chromium (the computed
// style reports our custom colors, but the actual rendered popup stays the
// OS-native white listbox), which made every option but the hovered one
// unreadable in dark mode. Building the list from plain styled elements
// sidesteps that entirely.
function Select({ id, value, options, labels, onChange }) {
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

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="bg-cream/5 border border-cream/15 rounded-lg text-cream px-2 py-1 text-xs flex items-center gap-1.5 focus:border-tomato focus:ring-2 focus:ring-tomato/40 outline-none"
      >
        {labels[value]}
        <span className="text-sage text-[10px]">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 top-full mt-1 z-10 bg-pine border border-cream/15 rounded-lg shadow-lg overflow-hidden min-w-full"
        >
          {options.map((option) => (
            <li key={option} role="option" aria-selected={option === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className={`w-full text-left px-2 py-1.5 text-xs whitespace-nowrap ${
                  option === value ? 'bg-tomato/20 text-tomato' : 'text-cream hover:bg-cream/10'
                }`}
              >
                {labels[option]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Select
