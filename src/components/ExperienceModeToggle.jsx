import { useTranslation } from '../hooks/useTranslation'

const OPTIONS = ['simple', 'full']

// Shared sliding two-option pill — mounted in App.jsx's header and again in
// SettingsModal.jsx's General category (see the Experience Mode plan).
// Reuses the app's existing solid-fill active-pill language (TabNav's active
// tab, Timer's session switcher: bg-tomato + text-on-tomato) but adds an
// actual animated sliding thumb instead of an instant color swap.
//
// `locked` is the guest case: guests are always 'simple' (see
// experienceMode.js's resolveExperienceMode), so Full isn't a real toggle
// target here — clicking it calls onRequestUpgrade (opens a signup nudge)
// instead of onChange. Two independently-clickable dead buttons would read
// as broken rather than locked, so Simple still renders as the active side
// (true — guests really are simple) while only Full's handler differs.
function ExperienceModeToggle({ mode, onChange, locked = false, onRequestUpgrade, compact = false }) {
  const { t } = useTranslation()

  function handleClick(option) {
    if (option === mode) return
    if (locked && option === 'full') {
      onRequestUpgrade()
      return
    }
    onChange(option)
  }

  return (
    <div
      className={
        'relative inline-flex flex-shrink-0 rounded-full border border-cream/15 bg-pine-dark p-0.5 ' +
        (compact ? 'text-[10px]' : 'text-xs')
      }
    >
      <span
        aria-hidden="true"
        className={
          'absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-tomato transition-transform duration-200 ease-out ' +
          (mode === 'full' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0')
        }
      />
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleClick(option)}
          aria-pressed={mode === option}
          aria-label={locked && option === 'full' ? t('experienceMode.fullLockedAria') : undefined}
          title={locked && option === 'full' ? t('experienceMode.fullLockedAria') : undefined}
          className={
            'relative z-10 flex-1 font-display tracking-widest uppercase font-semibold rounded-full transition-colors whitespace-nowrap ' +
            (compact ? 'px-2.5 py-1' : 'px-3.5 py-1.5') +
            ' ' +
            (mode === option ? 'text-on-tomato' : 'text-sage hover:text-cream')
          }
        >
          {t(`experienceMode.${option}Short`)}
        </button>
      ))}
    </div>
  )
}

export default ExperienceModeToggle
