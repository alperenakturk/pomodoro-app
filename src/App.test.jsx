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
// remoteProvider.* dependency is faked).
let remoteCache = {}
vi.mock('./lib/remoteProvider', () => ({
  initializeRemoteData: vi.fn(async (userId, localSnapshots) => {
    remoteCache = {
      ...localSnapshots,
      pomodoro_inventory: [
        { id: 'remote-1', text: 'REMOTE TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
      ],
    }
    return { migrated: false, error: null }
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
  mockAuthValue = { user: null, loading: false }
  // This test seeds real guest data before signing in, which now trips the
  // merge-confirmation prompt (hasLocalGuestData() in storage.js) —
  // answering "yes" reproduces the pre-existing unconditional-merge
  // behavior this test was written against, rather than leaving
  // window.confirm to jsdom's unimplemented (falsy, console-noisy) default.
  window.confirm = vi.fn(() => true)
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
