import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { AuthContext } from './context'

const NOT_CONFIGURED_ERROR = { message: 'Sign-in is not available right now.' }

// Mirrors lib/i18n/LanguageContext.jsx's pattern — a Context because auth
// state (are we signed in, as whom) is needed from deeply nested places
// (Settings' account row, a future storage.js provider swap) without prop-
// drilling it through every intermediate component.
//
// Accounts are optional: `user` is `null` for guests, and nothing here ever
// blocks app usage — the existing localStorage-only flow (storage.js) keeps
// working completely independent of auth state. This provider only owns
// *session* state; it deliberately does not touch storage.js's data logic
// or migrate anything (that's a separate, later step).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // No Supabase configured (see supabaseClient.js) -> nothing to load,
  // start "not loading" so guest mode never sees a stuck spinner.
  const [loading, setLoading] = useState(() => supabase != null)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Picks up both explicit sign-in/out calls below and the session that
    // Supabase's client establishes automatically after an OAuth redirect
    // lands back on this app (detectSessionInUrl is on by default) — so the
    // account row updates itself with no extra "handle the redirect" code.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    // Must match a URL registered in the Supabase project's Auth > URL
    // Configuration (Site URL / Additional Redirect URLs) — see CLAUDE.md.
    // Built from Vite's own BASE_URL rather than hardcoded, so it resolves
    // correctly both at localhost:5173/ (dev) and
    // https://<user>.github.io/pomodoro-app/ (GitHub Pages production).
    const redirectTo = window.location.origin + import.meta.env.BASE_URL
    return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    return supabase.auth.signUp({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return { error: null }
    return supabase.auth.signOut()
  }, [])

  // Calls the `delete_user()` Postgres function (supabase/schema.sql) rather
  // than supabase.auth.admin.deleteUser() — the admin API needs the service-
  // role key, which must never reach the browser. That SQL function is
  // SECURITY DEFINER but only ever deletes the caller's own row
  // (auth.uid()), and every table's user_id FK cascades on delete, so this
  // one call is enough to remove the account and all of its Supabase data.
  // Explicitly signs out afterward — deleting the row doesn't itself
  // invalidate the current session's client-side state.
  const deleteAccount = useCallback(async () => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    const { error } = await supabase.rpc('delete_user')
    if (error) return { error }
    await supabase.auth.signOut()
    return { error: null }
  }, [])

  // Settings' "Change Password" (email/password accounts only — see
  // hasPasswordProvider in ChangePasswordModal.jsx). Supabase's own
  // updateUser() already requires an active session, so there's no separate
  // "confirm current password" step to build — the user is already proven
  // to be who they say by virtue of being signed in.
  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    return supabase.auth.updateUser({ password: newPassword })
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      deleteAccount,
      updatePassword,
    }),
    [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, deleteAccount, updatePassword]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
