import { THEMES, THEME_TIERS } from '../lib/theme'
import { useTranslation } from '../hooks/useTranslation'

// The 10 real-palette swatch buttons, grouped into the three tiers defined
// in lib/theme.js (Dark / Light Pastel / Light Vivid) with the flagship
// "recommended" theme per tier badged and listed first. Shared by
// SettingsModal (which renders this inside its own `flex flex-wrap` row,
// alongside an additional "Custom" meta-option button as a sibling) and
// AccountSetupFlow's theme step (its own equivalent wrapping, no Custom
// option — picking among sub-themes is too much for a first-run wizard;
// Custom stays reachable afterward in Settings). Renders one block per
// tier (a small tracked-caps tier label + a flex-wrap row of swatches)
// rather than a flat button list, since 10 ungrouped swatches would read as
// noise — but still no single top-level wrapping div, so callers can stack
// the three tier blocks alongside their own extra buttons/rows. Selecting a
// swatch calls `onSelect` synchronously, so wherever this is mounted inside
// the app's actual themed root, the effect is a real live preview, not a
// mocked one.
function ThemePicker({ value, onSelect }) {
  const { t } = useTranslation()
  return THEME_TIERS.map((tier) => {
    const tierThemes = THEMES.filter((option) => option.tier === tier.id)
    return (
      <div key={tier.id} className="flex flex-col gap-1.5">
        <span className="font-display text-sage text-[10px] tracking-widest uppercase">
          {t(tier.labelKey)}
        </span>
        <div className="flex flex-wrap gap-2">
          {tierThemes.map((option) => {
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
                  className={`${option.id} grid grid-cols-2 gap-0.5 rounded p-1 border border-cream/10`}
                  style={{ backgroundColor: 'var(--color-pine)' }}
                >
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-pine-dark)' }} />
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-cream)' }} />
                  <span className="w-2.5 h-2.5 rounded-sm col-span-2" style={{ backgroundColor: 'var(--color-sage)' }} />
                </span>
                {/* option.recommended is intentionally not rendered right now
                    (badge felt premature per user feedback) — kept on the
                    data model in lib/theme.js so the badge can come back
                    later without re-deciding which theme flags per tier. */}
                <span>{t(option.labelKey)}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  })
}

export default ThemePicker
