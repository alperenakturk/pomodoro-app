import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

// Lives in App.jsx's header (top-right, visible on every tab) rather than
// tucked away in Settings — see CLAUDE.md's Authentication section. Kept
// deliberately compact: an icon, the email (or a Sign in button for guests),
// and — once signed in — a small Sign out button.
function AccountStatus() {
  const { t } = useTranslation()
  const { user, loading, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (loading) return null

  function handleSignOut() {
    // Same confirm() severity/style as the Danger Zone's delete actions —
    // signing out is non-destructive to data, but still a state change
    // worth an explicit confirmation rather than a stray misclick.
    if (window.confirm(t('settings.signOutConfirm'))) {
      signOut()
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sage text-xs font-sans">
        <AccountIcon className="w-4 h-4 flex-shrink-0" />
        {user ? (
          <>
            <span className="truncate max-w-[8rem] sm:max-w-[16rem]" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-cream border border-cream/15 rounded-full px-2 py-0.5 flex-shrink-0"
            >
              {t('settings.signOutButton')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-tomato border border-tomato/40 rounded-full px-2 py-0.5 flex-shrink-0"
          >
            {t('auth.signInButton')}
          </button>
        )}
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}

function AccountIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 20c1.4-3.8 4.6-6 7.5-6s6.1 2.2 7.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default AccountStatus
