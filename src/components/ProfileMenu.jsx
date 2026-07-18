import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

// Replaces the old AccountStatus.jsx — lives in App.jsx's header (top-right,
// next to the date/time and the Settings gear), visible on every tab.
// Guest: a plain "Sign in" button (opens AuthModal, same as before). Signed
// in: a circular avatar button (the email's first letter) that opens a
// dropdown menu — click-outside/Escape-to-close, same pattern as
// Select.jsx's own from-scratch dropdown. "Sign out" is the only entry for
// now; `menuItems` is a plain array specifically so a future item (e.g.
// "Account") is just one more array entry, not a restructure.
function ProfileMenu() {
  const { t } = useTranslation()
  const { user, loading, signOut } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  if (loading) return null

  function handleSignOut() {
    setMenuOpen(false)
    // Same confirm() severity/style as the Danger Zone's delete actions —
    // signing out is non-destructive to data, but still a state change
    // worth an explicit confirmation rather than a stray misclick.
    if (window.confirm(t('settings.signOutConfirm'))) {
      signOut()
    }
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="text-tomato-text border border-tomato/40 rounded-full px-4 py-1.5 text-sm font-sans font-semibold flex-shrink-0 transition-colors hover:bg-tomato/10 hover:border-tomato/60"
        >
          {t('auth.signInButton')}
        </button>
        {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      </>
    )
  }

  const menuItems = [{ key: 'signOut', label: t('settings.signOutButton'), onSelect: handleSignOut }]
  const initial = user.email ? user.email[0].toUpperCase() : '?'

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('header.accountMenuAria')}
        title={user.email}
        className="w-9 h-9 rounded-full bg-tomato/20 border border-tomato/40 text-tomato font-display text-sm flex items-center justify-center transition-colors hover:bg-tomato/30"
      >
        {initial}
      </button>

      {menuOpen && (
        <ul
          role="menu"
          aria-label={t('header.accountMenuAria')}
          className="absolute right-0 top-full mt-1 z-20 bg-pine border border-cream/15 rounded-lg shadow-lg overflow-hidden min-w-[8rem]"
        >
          {menuItems.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={item.onSelect}
                className="w-full text-left px-3 py-2 text-xs font-sans text-cream hover:bg-cream/10 whitespace-nowrap"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ProfileMenu
