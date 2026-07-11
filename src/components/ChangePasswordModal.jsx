import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import { inputClass } from '../lib/constants'
import PasswordVisibilityToggle from './PasswordVisibilityToggle'

// Same modal shell/form style as AuthModal.jsx (and the same
// PasswordVisibilityToggle it uses) for visual consistency, just without the
// email field or Google/sign-up branches — the user is already signed in
// with a real session by the time this can open (see SettingsModal.jsx's
// `hasPasswordProvider` gate, which also keeps this hidden for Google-only
// accounts that have no password to change).
function ChangePasswordModal({ onClose }) {
  const { t } = useTranslation()
  const { updatePassword } = useAuth()
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    const { error: err } = await updatePassword(password)
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-heading"
        className="bg-pine border border-cream/15 rounded-3xl px-6 py-6 sm:px-8 sm:py-8 shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <p
            id="change-password-heading"
            className="font-display text-cream font-bold text-sm tracking-widest uppercase"
          >
            {t('settings.changePasswordTitle')}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sage text-xl leading-none flex-shrink-0"
            aria-label={t('settings.changePasswordCloseAria')}
          >
            ×
          </button>
        </div>

        {success ? (
          <>
            <p className="text-sage text-xs font-sans">{t('settings.changePasswordSuccess')}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream font-semibold mt-4"
            >
              {t('common.close')}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="new-password" className="text-sage text-[10px] font-sans uppercase tracking-wide">
                {t('settings.newPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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

            <div className="flex flex-col gap-1">
              <label
                htmlFor="new-password-confirm"
                className="text-sage text-[10px] font-sans uppercase tracking-wide"
              >
                {t('auth.confirmPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  id="new-password-confirm"
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

            {error && <p className="text-tomato text-xs font-sans">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream font-semibold disabled:opacity-50"
            >
              {t('settings.changePasswordButton')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ChangePasswordModal
