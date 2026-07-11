import { useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'

// Command names are literal keys, not translated content — only the Action
// column goes through t(). '?' (this modal's own opener) is included too,
// so the list is a complete reference of every Timer-tab shortcut.
const SHORTCUTS = [
  { command: 'Space', actionKey: 'timer.shortcutPause' },
  { command: 'Esc', actionKey: 'timer.shortcutVoid' },
  { command: 'F', actionKey: 'timer.shortcutFullscreen' },
  { command: '?', actionKey: 'timer.shortcutHelp' },
]

// Modeled after DayReview.jsx's modal shell (fixed backdrop, centered card,
// focus moved in on open/restored on close) for visual/behavioral
// consistency with the app's other modals.
function KeyboardShortcutsModal({ onClose }) {
  const { t } = useTranslation()
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-heading"
        className="bg-pine border border-cream/15 rounded-3xl px-6 py-6 sm:px-8 sm:py-8 shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <p
            id="keyboard-shortcuts-heading"
            className="font-display text-cream font-bold text-sm tracking-widest uppercase"
          >
            {t('timer.keyboardModalTitle')}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sage text-xl leading-none flex-shrink-0"
            aria-label={t('timer.shortcutsCloseAria')}
          >
            ×
          </button>
        </div>

        <table className="w-full font-sans text-sm">
          <thead>
            <tr className="text-sage text-[10px] uppercase tracking-wide">
              <th className="text-left font-normal pb-2">{t('timer.keyboardColCommand')}</th>
              <th className="text-left font-normal pb-2">{t('timer.keyboardColAction')}</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((row) => (
              <tr key={row.command} className="border-t border-cream/10">
                <td className="py-2 pr-3 text-cream font-display text-xs whitespace-nowrap">
                  <kbd className="bg-cream/10 border border-cream/15 rounded px-1.5 py-0.5">{row.command}</kbd>
                </td>
                <td className="py-2 text-sage">{t(row.actionKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
