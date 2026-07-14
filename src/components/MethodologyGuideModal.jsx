import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { GUIDE_SECTIONS } from '../lib/constants'
import RichText from './RichText'

// The optional "deeper learning path" for anyone who wants more than a coach
// mark's one-line hint — a proper reference view of the Pomodoro Technique,
// paraphrased from docs/methodology.md. Opened either from a CoachMark's
// "Learn more" link (which passes the topic most relevant to where the user
// was, via `initialSectionId`) or from one of Settings' two persistent
// entry points (General and About), with no initialSectionId — just opens
// on the first topic.
//
// Sidebar + content-pane layout (same shell pattern as SettingsModal's
// category sidebar and Reports' section stepper) rather than one long
// continuous scroll — each topic is meant to be read on its own, and a
// sidebar makes that "pick a topic" structure visible instead of implying
// one long article the user has to scroll through top to bottom.
function MethodologyGuideModal({ onClose, initialSectionId }) {
  const { t } = useTranslation()
  const [activeSectionId, setActiveSectionId] = useState(initialSectionId || GUIDE_SECTIONS[0].id)
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const activeSection = GUIDE_SECTIONS.find((section) => section.id === activeSectionId) ?? GUIDE_SECTIONS[0]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 sm:p-6 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="methodology-guide-heading"
        className="bg-pine border border-cream/15 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[min(85vh,42rem)] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="w-44 sm:w-64 flex-shrink-0 border-r border-cream/10 p-3 sm:p-4 flex flex-col gap-1 overflow-y-auto">
          <p
            id="methodology-guide-heading"
            className="font-display text-cream font-bold text-xs tracking-widest uppercase px-2 mb-2"
          >
            {t('methodologyGuide.title')}
          </p>
          {GUIDE_SECTIONS.map((section) => {
            const active = section.id === activeSectionId
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'text-left px-3 py-2 rounded-lg text-xs font-sans transition-colors border ' +
                  (active
                    ? 'bg-tomato/10 border-tomato/30 text-cream'
                    : 'border-transparent text-sage hover:text-cream')
                }
              >
                {t(section.titleKey)}
              </button>
            )
          })}
        </nav>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 relative">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-sage hover:text-cream text-xl leading-none"
            aria-label={t('methodologyGuide.closeAria')}
          >
            ×
          </button>

          <h2 className="font-sans text-cream font-semibold text-base mb-3 pr-8">{t(activeSection.titleKey)}</h2>
          <RichText text={t(activeSection.bodyKey)} className="font-sans text-sage text-sm leading-relaxed" />
        </div>
      </div>
    </div>
  )
}

export default MethodologyGuideModal
