import { useTranslation } from '../hooks/useTranslation'
import RichText from './RichText'

// A small growth nudge — deliberately NOT the coach-mark system (see
// CoachMark.jsx/constants.js's COACH_MARKS): those are methodology hints
// shown inline within a section's own content; this is a product nudge
// ("here's what an account gets you") shown once, to guests only, as a
// fixed corner card independent of whichever tab is active. Kept visually
// distinct from CoachMark on purpose, so the two are never confused:
// - positioned as a fixed bottom-right corner card, not inline in a tab's
//   content flow (and, as a side effect, this means it's simply not part of
//   Timer's fullscreen-mode DOM subtree, so it can never show up over the
//   ring in Fullscreen Focus Mode without any extra suppression logic)
// - a neutral cream-titled card with a small icon, not CoachMark's
//   tomato-titled one (the CTA button still uses tomato, consistent with
//   every other primary action in the app)
// - has its own floating "×" close button, which CoachMark deliberately
//   does not (CoachMark can render inside another modal, where a second "×"
//   would be confusing; this card never does)
function GuestSignupNudge({ onDismiss, onSignUp }) {
  const { t } = useTranslation()

  return (
    <div className="fixed bottom-6 right-6 z-40 w-full max-w-xs bg-pine-dark border border-cream/15 rounded-2xl px-5 py-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase flex items-center gap-1.5">
          <span aria-hidden="true">✨</span>
          {t('guestNudge.title')}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sage hover:text-cream text-lg leading-none flex-shrink-0"
          aria-label={t('guestNudge.dismissAria')}
        >
          ×
        </button>
      </div>
      <RichText text={t('guestNudge.body')} className="font-sans text-sage text-sm leading-relaxed" />
      <button
        type="button"
        onClick={onSignUp}
        className="font-sans text-xs px-3 py-1.5 rounded-lg bg-tomato text-cream mt-3"
      >
        {t('auth.signUpButton')}
      </button>
    </div>
  )
}

export default GuestSignupNudge
