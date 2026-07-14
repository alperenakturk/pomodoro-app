import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { saveInventory } from './lib/storage'
import { LanguageProvider } from './lib/i18n/LanguageContext.jsx'

function renderApp() {
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  )
}

// Regression test for a sign-out bug: after signing out, the screen kept
// showing the just-signed-out account's Supabase data instead of the real
// guest/local data. Root cause was a race between App's `key`-based remount
// (used to force every hook to re-read storage on an auth transition) and
// the actual provider/cache cleanup (signOutFromRemote) — the old code
// derived the remount key from `user` directly at render time
// (`dataMode === 'remote' && user ? user.id : 'guest'`), which flips to
// 'guest' — and therefore remounts AppInner — the instant `user` becomes
// null, *before* the effect that calls signOutFromRemote() has run. A fresh
// AppInner's hooks (useInventory etc.) read storage during that same remount,
// while activeProvider was still remoteProvider and its cache was still the
// old account's data.
//
// This is exercised here without a real Supabase project (unavailable/rate-
// limited in CI and during manual testing) by faking only the two
// dependencies that would otherwise need real network access — useAuth and
// remoteProvider — while leaving storage.js's real activeProvider-switching
// logic (the actual thing being verified) completely untouched.

let mockAuthValue = { user: null, loading: false }
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockAuthValue,
}))

// Stands in for the real remoteProvider.js: simulates "this account has
// REMOTE TASK in it" without any network access, while still going through
// storage.js's real signInToRemote/signOutFromRemote (only their
// remoteProvider.* dependency is faked). Signing in no longer reads or
// merges any local/guest data (see CLAUDE.md's Cloud sync section) —
// initializeRemoteData takes just a userId now, so this fake ignores
// whatever's in localStorage entirely, exactly like the real one does.
// `mockIsNewAccount` is mutable per-test so the AccountSetupFlow regression
// test below can simulate "first sign-in ever" vs. "returning sign-in" —
// mirrors how the real initializeRemoteData decides this from whether a
// settings row already exists (see remoteProvider.js/remoteProvider.test.js).
let remoteCache = {}
let mockIsNewAccount = false
vi.mock('./lib/remoteProvider', () => ({
  initializeRemoteData: vi.fn(async () => {
    remoteCache = {
      pomodoro_inventory: [
        { id: 'remote-1', text: 'REMOTE TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
      ],
    }
    return { error: null, isNewAccount: mockIsNewAccount }
  }),
  resetToLocalMode: vi.fn(() => {
    remoteCache = {}
  }),
  get: vi.fn((collection, fallback) => remoteCache[collection] ?? fallback),
  set: vi.fn((collection, value) => {
    remoteCache[collection] = value
  }),
  remove: vi.fn((collection) => {
    remoteCache[collection] = []
  }),
}))

beforeEach(() => {
  localStorage.clear()
  remoteCache = {}
  mockIsNewAccount = false
  mockAuthValue = { user: null, loading: false }
})

describe('App sign-out data-source switch', () => {
  it('shows real local/guest data (not stale remote data) immediately after signing out', async () => {
    // Seed distinguishable guest data before any sign-in happens.
    saveInventory([
      { id: 'guest-1', text: 'GUEST TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
    ])

    // Sign in — App's own effect calls (faked) signInToRemote, which warms
    // remoteCache with REMOTE TASK instead of GUEST TASK.
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    const { rerender: rerenderRaw } = renderApp()
    const rerender = () =>
      rerenderRaw(
        <LanguageProvider>
          <App />
        </LanguageProvider>
      )

    await screen.findByText('Pomodoro Technique')
    // Switch to the Planning tab to see the Inventory list.
    screen.getByRole('button', { name: 'Planning' }).click()
    await waitFor(() => expect(screen.getByText('REMOTE TASK')).toBeInTheDocument())
    expect(screen.queryByText('GUEST TASK')).not.toBeInTheDocument()

    // Sign out.
    mockAuthValue = { user: null, loading: false }
    rerender()

    // The bug: without the fix, this would still show REMOTE TASK because
    // the fresh AppInner mounted (via the key change) before
    // signOutFromRemote() ran, reading the stale remoteCache.
    await waitFor(() => {
      screen.getByRole('button', { name: 'Planning' }).click()
      expect(screen.getByText('GUEST TASK')).toBeInTheDocument()
    })
    expect(screen.queryByText('REMOTE TASK')).not.toBeInTheDocument()
  })
})

// Regression test for a reported bug: AccountSetupFlow (the first-time
// account setup wizard) re-triggered on a SECOND sign-in to an account that
// had already completed it. Root-caused to remoteProvider.js's
// initializeRemoteData: the account's settings row used to only get created
// as a side effect of the (now entirely removed) automatic local-data-merge
// step, which depended on user consent that didn't always happen — an
// account whose first sign-in skipped that write never got a row at all, so
// every later sign-in kept reporting isNewAccount: true and kept re-showing
// the wizard. The fix makes row creation unconditional (see
// remoteProvider.js/remoteProvider.test.js for the unit-level regression
// test); this test verifies the same thing end-to-end through App's actual
// mount/remount cycle: isNewAccount only ever drives AppInner's
// showAccountSetup state on the exact mount that follows it being true.
describe('App AccountSetupFlow trigger', () => {
  it('shows AccountSetupFlow on a first sign-in, then never again on later sign-ins to the same account', async () => {
    const { rerender: rerenderRaw } = renderApp()
    const rerender = () =>
      rerenderRaw(
        <LanguageProvider>
          <App />
        </LanguageProvider>
      )

    // First-ever sign-in for this account.
    mockIsNewAccount = true
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    rerender()
    await screen.findByText('Your account is ready')

    // Skip the wizard — same as a user clicking through without filling
    // anything in (every field is optional).
    screen.getByRole('button', { name: 'Skip setup' }).click()
    await waitFor(() => expect(screen.queryByText('Your account is ready')).not.toBeInTheDocument())

    // Sign out, then sign back in to the SAME account — a real second
    // sign-in now finds the settings row the first call created, so
    // isNewAccount is false, exactly like the real remoteProvider would
    // report (see remoteProvider.test.js's matching regression test).
    mockAuthValue = { user: null, loading: false }
    rerender()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument())

    mockIsNewAccount = false
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    rerender()
    await screen.findByText('Pomodoro Technique')
    expect(screen.queryByText('Your account is ready')).not.toBeInTheDocument()

    // Sign out and back in a third time, for good measure — must still
    // never reappear.
    mockAuthValue = { user: null, loading: false }
    rerender()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument())
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    rerender()
    await screen.findByText('Pomodoro Technique')
    expect(screen.queryByText('Your account is ready')).not.toBeInTheDocument()
  })
})
