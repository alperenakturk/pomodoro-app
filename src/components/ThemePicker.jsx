import { THEMES } from '../lib/theme'
import { useTranslation } from '../hooks/useTranslation'

// The 5 real-palette swatch buttons — shared by SettingsModal (which renders
// this inside its own `flex flex-wrap` row, alongside an additional "Custom"
// meta-option button as a sibling, and, once Custom is picked, four more
// sub-pickers reusing this same component) and AccountSetupFlow's theme step
// (wrapped in its own equivalent row, no Custom option — picking among 4
// sub-themes is too much for a first-run wizard; Custom stays reachable
// afterward in Settings). Deliberately renders just the buttons, not its own
// wrapping div, so callers can lay it out alongside their own extra buttons
// in a single flex row rather than nesting flex-wrap containers. Selecting a
// swatch calls `onSelect` synchronously, so wherever this is mounted inside
// the app's actual themed root, the effect is a real live preview, not a
// mocked one.
function ThemePicker({ value, onSelect }) {
  const { t } = useTranslation()
  return THEMES.map((option) => {
    const active = value === option.id || (value === 'light' && option.id === 'light-terracotta')
    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onSelect(option.id)}
        aria-pressed={active}
        className={
          'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ' +
          (active ? 'border-tomato text-cream' : 'border-cream/15 text-sage hover:text-cream')
        }
      >
        <span
          className={`${option.id} flex items-center gap-1 rounded p-1 border border-cream/10`}
          style={{ backgroundColor: 'var(--color-pine)' }}
        >
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-pine-dark)' }} />
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-cream)' }} />
        </span>
        {t(option.labelKey)}
      </button>
    )
  })
}

export default ThemePicker
