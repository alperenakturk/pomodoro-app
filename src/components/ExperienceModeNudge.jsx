import { useTranslation } from '../hooks/useTranslation'
import RichText from './RichText'

// Shown when a guest clicks the locked "Full" side of ExperienceModeToggle
// (see that component's `locked` prop). Deliberately mirrors
// GuestSignupNudge.jsx's exact shape (onDismiss/onSignUp props, fixed
// bottom-right card, own dedicated raw-localStorage "seen" flag in
// storage.js) rather than reusing that component directly, since the copy
// here is specific to Full mode rather than the general "get more with an
// account" pitch.
function ExperienceModeNudge({ onDismiss, onSignUp }) {
  const { t } = useTranslation()

  return (
    <div className="fixed bottom-6 right-6 z-40 w-full max-w-xs bg-pine-dark border border-cream/15 rounded-2xl px-5 py-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase flex items-center gap-1.5">
          <span aria-hidden="true">✨</span>
          {t('experienceMode.nudge.title')}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sage hover:text-cream text-lg leading-none flex-shrink-0"
          aria-label={t('experienceMode.nudge.dismissAria')}
        >
          ×
        </button>
      </div>
      <RichText text={t('experienceMode.nudge.body')} className="font-sans text-sage text-sm leading-relaxed" />
      <button
        type="button"
        onClick={onSignUp}
        className="font-sans text-xs px-3 py-1.5 rounded-lg bg-tomato text-on-tomato mt-3"
      >
        {t('auth.signUpButton')}
      </button>
    </div>
  )
}

export default ExperienceModeNudge
