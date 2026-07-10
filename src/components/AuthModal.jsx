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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
    setConfirmPassword('')
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
    if (mode === 'signUp' && password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
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
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                style={{ paddingRight: '2.5rem' }}
              />
              <PasswordVisibilityToggle
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                t={t}
              />
            </div>
          </div>

          {mode === 'signUp' && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="auth-confirm-password"
                className="text-sage text-[10px] font-sans uppercase tracking-wide"
              >
                {t('auth.confirmPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  style={{ paddingRight: '2.5rem' }}
                />
                <PasswordVisibilityToggle
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                  t={t}
                />
              </div>
            </div>
          )}

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

// Absolutely positioned inside the relative-wrapped input above — toggles
// the sibling input between type="password"/"text" via the `visible` state
// its parent owns (kept in AuthModal so each password field can be shown/
// hidden independently).
function PasswordVisibilityToggle({ visible, onToggle, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-sage hover:text-cream"
      aria-label={visible ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.17 5.24A10.7 10.7 0 0 1 12 5c7 0 10.5 7 10.5 7a13.3 13.3 0 0 1-3.05 3.9M6.5 6.66C3.87 8.4 1.5 12 1.5 12a13.3 13.3 0 0 0 5.06 5.44A10.6 10.6 0 0 0 12 19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default AuthModal
