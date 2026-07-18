import { useTranslation } from '../hooks/useTranslation'
import RichText from './RichText'

// A single, dismissible, short hint — contextual onboarding (see
// constants.js's COACH_MARKS/pickCoachMark), not a guided tour. Purely
// presentational: the caller decides *whether* to render this at all (via
// pickCoachMark's result), so this component doesn't take a `seen` flag or
// do any hiding logic itself — it only knows how to display whichever mark
// it was handed. Visually a tomato-accented card, distinct from ordinary
// content cards (bg-pine-dark border-cream/10) so it reads as "a hint."
//
// Deliberately has no floating "×" corner-dismiss like the app's actual
// modals (DayReview/KeyboardShortcutsModal/SettingsModal/
// MethodologyGuideModal) — a design review of the previous version flagged
// that a coach mark rendered *inside* one of those modals (e.g. Settings)
// put two near-identical "×" controls within ~60px of each other, reading as
// two ways to do the same thing when they actually close different things
// (the whole modal vs. just this hint). "Got it" is the one, unambiguous
// dismiss action.
function CoachMark({ titleKey, bodyKey, onDismiss, onLearnMore, className = '' }) {
  const { t } = useTranslation()

  return (
    <div className={`bg-pine-dark border border-tomato/25 rounded-2xl px-5 py-4 shadow-lg w-full ${className}`}>
      <p className="font-display text-tomato-text font-bold text-xs tracking-widest uppercase mb-1.5">{t(titleKey)}</p>
      <RichText text={t(bodyKey)} className="font-sans text-cream/90 text-sm leading-relaxed" />
      <div className="flex items-center gap-4 mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="font-sans text-xs px-3 py-1.5 rounded-lg bg-tomato text-on-tomato"
        >
          {t('coachMarks.gotIt')}
        </button>
        <button
          type="button"
          onClick={onLearnMore}
          className="font-sans text-xs text-tomato-text underline decoration-dotted"
        >
          {t('coachMarks.learnMore')}
        </button>
      </div>
    </div>
  )
}

export default CoachMark
