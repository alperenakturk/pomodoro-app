import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

const rowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-cream/10 last:border-b-0'

// The Settings tab's account indicator — deliberately the very first row in
// the Settings card (see SettingsTab.jsx), since whether you're signed in
// or in guest/local-only mode is the most fundamental piece of state here.
// Rendering nothing while `loading` avoids a flash of "Not signed in" before
// Supabase has had a chance to report an existing session.
function AccountStatus() {
  const { t } = useTranslation()
  const { user, loading, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (loading) return null

  return (
    <>
      <div className={rowClass}>
        <span>{user ? t('settings.signedInAs', { email: user.email }) : t('settings.notSignedIn')}</span>
        {user ? (
          <button
            type="button"
            onClick={() => signOut()}
            className="text-cream border border-cream/15 rounded-full px-3 py-1"
          >
            {t('settings.signOutButton')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-tomato border border-tomato/40 rounded-full px-3 py-1"
          >
            {t('auth.signInButton')}
          </button>
        )}
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}

export default AccountStatus
