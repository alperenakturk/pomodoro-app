import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import {
  saveInventory,
  setAuthHint,
  hasAuthHint,
  markGuestOnboardingSeen,
  hasSeenGuestOnboarding,
  setPendingOnboardingTransfer,
  resetAllData,
  signOutFromRemote,
} from './lib/storage'

// App now instantiates its own LanguageProvider internally, keyed the same
// as its per-account render tree (see App.jsx) — matches real usage
// (main.jsx renders <App /> directly, with no external LanguageProvider),
// so no wrapping is needed here either.
function renderApp() {
  return render(<App />)
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
// null (the default) means "the account has no explicit language
// preference" — same as a real account whose settings.language column is
// null — so LanguageContext's own resolveLanguage() auto-detects (jsdom's
// navigator.language resolves to English), matching what every pre-existing
// test in this file already implicitly assumes. Only the language-resync
// regression test below sets this to something else.
let mockRemoteLanguage = null
vi.mock('./lib/remoteProvider', () => ({
  initializeRemoteData: vi.fn(async () => {
    remoteCache = {
      pomodoro_inventory: [
        { id: 'remote-1', text: 'REMOTE TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
      ],
      pomodoro_settings: { language: mockRemoteLanguage },
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
  mockRemoteLanguage = null
  mockAuthValue = { user: null, loading: false }
  // storage.js's activeProvider is module-level mutable state, outliving
  // any one test — a prior test that signed in and never (via its own
  // App-level flow) signed back out would otherwise leave it pointed at
  // remoteProvider here, silently routing this test's own saveX() setup
  // calls to the mocked remote cache instead of real localStorage.
  signOutFromRemote()
  // Every test in this file predates Guest Onboarding (AccountSetupFlow's
  // 'guestIntro' variant, see App.jsx) and is about unrelated guest/sign-in
  // regressions — a first-time guest's `pomodoro_guest_onboarding_seen`
  // flag defaults to unset after localStorage.clear() above, which would
  // otherwise put every one of these tests behind that new full-screen
  // overlay too. Marking it seen keeps them decoupled; Guest Onboarding
  // itself is covered by its own describe block below.
  markGuestOnboardingSeen()
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
    const rerender = () => rerenderRaw(<App />)

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
    const rerender = () => rerenderRaw(<App />)

    // First-ever sign-in for this account.
    mockIsNewAccount = true
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    rerender()
    await screen.findByText('Your account is ready')

    // Skip the wizard — same as a user clicking through without filling
    // anything in (every field is optional).
    screen.getByRole('button', { name: 'Skip setup entirely' }).click()
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

// Regression test for the reload flicker/reappearing-coach-marks bug:
// reloading the page while already signed in used to mount AppInner in
// guest mode immediately (App's dataMode always started 'guest', and the
// effect that would move it past that skips its body entirely while
// useAuth's `loading` is still true — which it always briefly is, right
// after a real reload, since getSession() is async) — reading local
// guest-mode storage for one render before the real account data arrived
// and remounted everything. The fix: dataMode's initial guess consults
// storage.js's hasAuthHint(), a plain localStorage flag set once a sign-in
// actually succeeds — so a browser that was signed in last time starts
// straight at 'loading' instead of 'guest', skipping that wrong paint
// entirely. This only matters for a real fresh `render()` (a genuine first
// mount, like a reload) — `rerender()` on an already-mounted App doesn't
// re-run the lazy dataMode initializer, same as a real SPA navigation
// wouldn't re-run it either.
describe('App reload flicker prevention', () => {
  it('does not flash guest-mode data while a reload\'s auth check is still pending', async () => {
    // Distinguishable guest-local data, as if this browser had used guest
    // mode at some point (or simply has whatever default local state).
    saveInventory([
      { id: 'guest-1', text: 'GUEST TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
    ])
    // Simulate "this browser's last successful load was signed in" —
    // exactly what a real signInToRemote() success would have left behind
    // before this reload.
    setAuthHint()
    expect(hasAuthHint()).toBe(true)

    // Mirrors the real moment right after a reload: useAuth's initial
    // getSession() call hasn't resolved yet.
    mockAuthValue = { user: null, loading: true }
    const { rerender } = renderApp()

    // Neither guest content nor any account content should be visible yet —
    // the old bug specifically showed the guest app (header + GUEST TASK)
    // immediately here, before the real signed-in session was even known.
    expect(screen.queryByText('Pomodoro Technique')).not.toBeInTheDocument()
    expect(screen.queryByText('GUEST TASK')).not.toBeInTheDocument()

    // Auth check resolves: this browser really is still signed in.
    mockIsNewAccount = false
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    rerender(<App />)

    await screen.findByText('Pomodoro Technique')
    screen.getByRole('button', { name: 'Planning' }).click()
    // The account's real (remote) data shows — never the local guest data.
    await waitFor(() => expect(screen.getByText('REMOTE TASK')).toBeInTheDocument())
    expect(screen.queryByText('GUEST TASK')).not.toBeInTheDocument()
  })

  it('still mounts guest mode immediately when this browser has never signed in', async () => {
    expect(hasAuthHint()).toBe(false)
    saveInventory([
      { id: 'guest-1', text: 'GUEST TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
    ])
    mockAuthValue = { user: null, loading: true }
    renderApp()

    // No hint on this browser -> the common guest case must still render
    // instantly, not wait on the auth check at all.
    await screen.findByText('Pomodoro Technique')
    screen.getByRole('button', { name: 'Planning' }).click()
    expect(screen.getByText('GUEST TASK')).toBeInTheDocument()
  })
})

// Regression test for a second, quieter bug found while investigating the
// flicker above: LanguageProvider used to live in main.jsx, wrapping App
// itself — outside App's own dataMode/appKey remount cycle entirely. Its
// `language` state was read once, at the very first paint of the whole app
// (necessarily from whatever local/guest settings existed then, since
// remote data can't have loaded yet), and never revisited afterward. Theme/
// seenCoachMarks/etc. all self-heal once the real account data arrives
// because they live inside AppInner, which remounts fresh via its `key`;
// language didn't, so a signed-in account's own saved language preference
// silently never took effect after a reload — the app just stayed in
// whichever language it guessed at that first paint, with no flicker to
// notice it by (unlike theme). Fixed by moving LanguageProvider inside
// App.jsx, keyed the same as AppInner (see App.jsx's return).
describe('App language re-sync on sign-in', () => {
  it("applies the signed-in account's saved language after the remote data loads, not whatever this browser guessed at first paint", async () => {
    // This browser's local/guest state has no explicit language -> resolves
    // to English (jsdom's navigator.language), same as the guest-mode tests
    // above.
    mockAuthValue = { user: null, loading: false }
    const { rerender } = renderApp()
    await screen.findByText('Pomodoro Technique')
    expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument()

    // The account being signed into has an explicit Turkish preference
    // saved remotely.
    mockRemoteLanguage = 'tr'
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    rerender(<App />)

    // Once the real account data has loaded, the UI must reflect ITS
    // language — not the English this browser guessed before sign-in.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Planlama' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Planning' })).not.toBeInTheDocument()
  })

  // The sign-in direction above happens to self-heal even without
  // LanguageProvider being explicitly keyed, because App's own dataMode
  // passes through a *structurally different* 'loading' return value
  // (LoadingAccountScreen, not <LanguageProvider>) on its way from
  // guest/loading to remote — which incidentally remounts everything below
  // it regardless of key. Sign-OUT doesn't get that same accidental help:
  // 'remote' -> 'guest' is a direct transition (dataMode never passes
  // through 'loading' on sign-out — see App.jsx's `!userId` branch), so the
  // returned tree shape is identical on both sides and only `key={appKey}`
  // forces LanguageProvider to actually remount and re-resolve language.
  // Without it, signing out of a Turkish account would leave the UI stuck
  // in Turkish instead of reverting to this browser's own language.
  it('reverts to the local/guest language on sign-out, not stuck on the account language', async () => {
    mockRemoteLanguage = 'tr'
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    const { rerender } = renderApp()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Planlama' })).toBeInTheDocument())

    mockAuthValue = { user: null, loading: false }
    rerender(<App />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Planlama' })).not.toBeInTheDocument()
  })
})

// Guest Onboarding (AccountSetupFlow's 'guestIntro' variant) — shown once to
// a first-time guest, closing with a "Create free account" pitch. The outer
// beforeEach above marks it seen (so every other describe block in this file
// stays decoupled from it) — this local beforeEach re-clears localStorage
// after that, undoing the mark, since "unseen" is the exact precondition
// these tests need.
describe('Guest Onboarding', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows to a first-time guest, and declining marks it seen so a later mount never shows it again', async () => {
    expect(hasSeenGuestOnboarding()).toBe(false)
    const { rerender: rerenderRaw } = renderApp()
    const rerender = () => rerenderRaw(<App />)

    await screen.findByText('Where should we start?')
    screen.getByRole('button', { name: 'Skip setup entirely' }).click()

    await waitFor(() => expect(screen.queryByText('Where should we start?')).not.toBeInTheDocument())
    expect(hasSeenGuestOnboarding()).toBe(true)
    await screen.findByText('Pomodoro Technique')

    // A later mount (e.g. a reload) must not show it again.
    rerender()
    expect(screen.queryByText('Where should we start?')).not.toBeInTheDocument()
  })

  it('does not show once already marked seen (e.g. an existing guest before this feature shipped)', async () => {
    markGuestOnboardingSeen()
    renderApp()

    await screen.findByText('Pomodoro Technique')
    expect(screen.queryByText('Where should we start?')).not.toBeInTheDocument()
  })

  it('clicking "Create free account" on the closing step stores a pending transfer of the wizard\'s picks', async () => {
    renderApp()
    await screen.findByText('Where should we start?')

    // Advance to the theme step and pick one, then continue to the closing
    // pitch (welcome -> language -> name -> theme picked -> goal -> signup).
    screen.getByRole('button', { name: 'Skip this step' }).click()
    screen.getByRole('button', { name: 'Skip this step' }).click()
    screen.getByRole('button', { name: 'Skip this step' }).click()
    await screen.findByText('Pick a look')
    screen.getByRole('button', { name: 'Light Sage' }).click()
    screen.getByRole('button', { name: 'Skip this step' }).click()
    screen.getByRole('button', { name: 'Skip this step' }).click()

    await screen.findByText('Create a free account to unlock more')
    screen.getByRole('button', { name: 'Create free account' }).click()

    // AuthModal opens, landed on the sign-up tab.
    await screen.findByText('Create an account')

    const stored = JSON.parse(localStorage.getItem('pomodoro_pending_onboarding_transfer'))
    expect(stored.snapshot.theme).toBe('light-sage')
    expect(hasSeenGuestOnboarding()).toBe(true)
  })

  it('a new account signed up through the wizard gets the transferred settings and skips the post-signup wizard', async () => {
    // Simulate having already gone through the wizard and clicked "Create
    // free account" (see the test above) — a pending transfer is armed.
    setPendingOnboardingTransfer({ theme: 'light-sand', displayName: 'Aylin', dailyPomodoroGoal: 6, language: 'en' })
    markGuestOnboardingSeen()

    mockIsNewAccount = true
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    renderApp()

    await screen.findByText('Pomodoro Technique')
    // The regular post-signup wizard must NOT show — the guestIntro wizard
    // already covered the same ground right before sign-up.
    expect(screen.queryByText('Your account is ready')).not.toBeInTheDocument()

    await waitFor(() => expect(remoteCache.pomodoro_settings).toMatchObject({ theme: 'light-sand', displayName: 'Aylin', dailyPomodoroGoal: 6 }))
    // One-shot: the pending transfer must not still be sitting around to
    // reapply to some later, unrelated sign-in.
    expect(localStorage.getItem('pomodoro_pending_onboarding_transfer')).toBeNull()
  })

  // Danger Zone's "Reset to Factory Settings" calls resetAllData() then does
  // a real window.location.reload() (see SettingsModal.jsx's
  // handleFactoryReset) — a fresh render() here is the same simulated-reload
  // technique the "App reload flicker prevention" describe block above uses,
  // since jsdom has no real navigation to trigger.
  it('a guest who factory-resets sees the wizard again on the next load, exactly like a first-ever visit', async () => {
    markGuestOnboardingSeen()
    expect(hasSeenGuestOnboarding()).toBe(true)

    await resetAllData()
    expect(hasSeenGuestOnboarding()).toBe(false)

    renderApp() // simulates the reload after Factory Reset
    await screen.findByText('Where should we start?')
  })
})

// Combinations explicitly requested: local <-> signed-in transitions, and
// each one crossed with Factory Reset, must all leave the app in a
// consistent, non-broken state — no stuck loading screen, no wrong wizard,
// no stale data bleeding across the boundary. Each test below is one named
// combination.
describe('Local/account transitions stay consistent across combinations', () => {
  it('guest -> signs up directly via the header (not through Guest Onboarding) -> gets the plain post-signup wizard, no guest pitch, no transfer', async () => {
    markGuestOnboardingSeen() // already past Guest Onboarding, same as most real accounts
    mockIsNewAccount = true
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    renderApp()

    // The 'account' variant (plain, no "create free account" pitch) — never
    // the guestIntro one, since this sign-up didn't come through that flow.
    await screen.findByText('Your account is ready')
    expect(screen.queryByText('Create a free account to unlock more')).not.toBeInTheDocument()
  })

  it('signed in -> signs out -> lands back on this browser\'s own untouched guest data, no onboarding re-trigger', async () => {
    markGuestOnboardingSeen()
    saveInventory([
      { id: 'guest-1', text: 'GUEST TASK', estimate: null, categoryIds: [], notes: '', unplanned: false, done: false },
    ])
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    const { rerender: rerenderRaw } = renderApp()
    const rerender = () => rerenderRaw(<App />)
    await screen.findByText('Pomodoro Technique')

    mockAuthValue = { user: null, loading: false }
    rerender()

    await screen.findByText('Pomodoro Technique')
    expect(screen.queryByText('Where should we start?')).not.toBeInTheDocument()
    // Retried, same as the sign-out data-source test above — the Planning
    // panel's own re-read of local storage lands a beat after the header
    // text does.
    await waitFor(() => {
      screen.getByRole('button', { name: 'Planning' }).click()
      expect(screen.getByText('GUEST TASK')).toBeInTheDocument()
    })
  })

  it('signed in -> factory resets -> the settings row is gone, so the next load reports isNewAccount and shows the post-signup wizard again', async () => {
    mockIsNewAccount = false
    mockAuthValue = { user: { id: 'user-1' }, loading: false }
    const { unmount } = renderApp()
    await screen.findByText('Pomodoro Technique')
    unmount() // a real Factory Reset ends in window.location.reload(), tearing down this whole tree

    // Mirrors what a real factory reset does server-side: the settings row
    // is deleted, so the very next initializeRemoteData() call has nothing
    // to find — exactly the same signal a genuinely brand-new account gives
    // (see remoteProvider.js/remoteProvider.test.js's own coverage of that
    // detection). Simulated here via the same mockIsNewAccount switch the
    // "first sign-in" regression test above already uses, rather than
    // re-deriving it from remoteCache, since that detection logic itself is
    // already covered elsewhere and isn't what this test is about.
    mockIsNewAccount = true
    renderApp() // simulates the reload after Factory Reset

    await screen.findByText('Your account is ready')
  })
})
