// Shared chevron toggle for the Planning tab's compact side cards
// (AvailablePomodoros, Inventory, Timetable — design-mockups/07) — same
// three call sites, same behavior, so it's extracted once rather than
// tripled, mirroring PasswordVisibilityToggle.jsx's reasoning.
function CollapseToggle({ open, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className="text-sage hover:text-cream flex-shrink-0"
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default CollapseToggle
