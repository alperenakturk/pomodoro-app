import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import { inputClass } from '../lib/constants'

// Modeled after DayReview.jsx's modal shell (fixed backdrop, centered card,
// focus moved in on open and restored on close) for visual/behavioral
// consistency with the app's one other modal.
//
// "Continue without an account" (and the backdrop/× close) all just call
// onClose — there is no guest-mode-specific state to set up here. Accounts
// are additive: dismissing this modal leaves the app exactly as it was,
// running on localStorage (storage.js), same as before this modal ever
// existed.
function AuthModal({ onClose }) {
  const { t } = useTranslation()
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  function switchMode() {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'))
    setError(null)
    setInfo(null)
  }

  async function handleGoogle() {
    setError(null)
    const { error: err } = await signInWithGoogle()
    // On success the browser navigates away to Google's OAuth consent
    // screen — there's nothing else to do here in that case.
    if (err) setError(err.message)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const action = mode === 'signIn' ? signInWithEmail : signUpWithEmail
    const { data, error: err } = await action(email, password)
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    if (mode === 'signUp' && !data.session) {
      // Supabase's default project setting requires confirming the email
      // address before a session is issued — nothing to sign in to yet.
      setInfo(t('auth.signUpSuccessMessage'))
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-heading"
        className="bg-pine border border-cream/15 rounded-3xl px-6 py-6 sm:px-8 sm:py-8 shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <p
            id="auth-modal-heading"
            className="font-display text-cream font-bold text-sm tracking-widest uppercase"
          >
            {mode === 'signIn' ? t('auth.signInTitle') : t('auth.signUpTitle')}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sage text-xl leading-none flex-shrink-0"
            aria-label={t('auth.closeAria')}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full font-sans text-sm px-4 py-2 rounded-xl border border-cream/20 text-cream mb-4"
        >
          {t('auth.googleButton')}
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="flex-1 h-px bg-cream/10" aria-hidden="true" />
          <span className="text-sage text-xs font-sans">{t('auth.orDivider')}</span>
          <span className="flex-1 h-px bg-cream/10" aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="auth-email" className="text-sage text-[10px] font-sans uppercase tracking-wide">
              {t('auth.emailLabel')}
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="auth-password" className="text-sage text-[10px] font-sans uppercase tracking-wide">
              {t('auth.passwordLabel')}
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-tomato text-xs font-sans">{error}</p>}
          {info && <p className="text-sage text-xs font-sans">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream font-semibold disabled:opacity-50"
          >
            {mode === 'signIn' ? t('auth.signInButton') : t('auth.signUpButton')}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="text-sage text-xs font-sans underline decoration-dotted mt-3"
        >
          {mode === 'signIn' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-sage text-xs font-sans mt-4 pt-4 border-t border-cream/10"
        >
          {t('auth.continueWithoutAccount')}
        </button>
      </div>
    </div>
  )
}

export default AuthModal
