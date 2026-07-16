import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
import { useInventory } from './hooks/useInventory'
import { useTodayTasks } from './hooks/useTodayTasks'
import { usePomodoro } from './hooks/usePomodoro'
import { useCategories } from './hooks/useCategories'
import { useTimetable } from './hooks/useTimetable'
import { useStreak } from './hooks/useStreak'
import { useAuth } from './hooks/useAuth'
import {
  loadSettings,
  patchSettings,
  addVoidLogEntry,
  signInToRemote,
  signOutFromRemote,
  hasSeenGuestSignupNudge,
  markGuestSignupNudgeSeen,
  hasAuthHint,
  setAuthHint,
  clearAuthHint,
  getLastThemeHint,
  setLastThemeHint,
} from './lib/storage'
import { useTranslation } from './hooks/useTranslation'
import { LanguageProvider } from './lib/i18n/LanguageContext'
import { themeClassName } from './lib/theme'
import { totalTimetableHours } from './lib/timetable'
import Timer from './components/Timer'
import Inventory from './components/Inventory'
import TodoToday from './components/TodoToday'
import AvailablePomodoros from './components/AvailablePomodoros'
import Timetable from './components/Timetable'
import RecordsLog from './components/RecordsLog'
import Reports from './components/Reports'
import TabNav from './components/TabNav'
import ProfileMenu from './components/ProfileMenu'
import CoachMark from './components/CoachMark'
import MethodologyGuideModal from './components/MethodologyGuideModal'
import AccountSetupFlow from './components/AccountSetupFlow'
import GuestSignupNudge from './components/GuestSignupNudge'
import AuthModal from './components/AuthModal'
import StreakCelebration from './components/StreakCelebration'
import StreakDetailsModal from './components/StreakDetailsModal'
import { COACH_MARKS, pickCoachMark } from './lib/constants'

// Lazy-loaded: SettingsModal is ~1100 lines, only ever rendered once
// `settingsOpen` is true (see its conditional render below), and never
// needed for first paint (the Timer tab). Splitting it into its own chunk
// keeps it out of the bundle everyone downloads on first load, including
// guests who never open it in a session. See the <Suspense> wrapper below
// for the fallback shown for the brief moment the chunk is still loading.
const SettingsModal = lazy(() => import('./components/SettingsModal'))

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

// Auth-transition gate + error banner live here, one level above the actual
// app tree (AppInner) — see CLAUDE.md's Authentication section for the full
// reasoning. In short: guest usage (the common case) never waits on
// anything, since AppInner mounts immediately in local mode before
// useAuth's initial session check even resolves. Only an *actual* sign-in
// (user goes from null to a real session) pays for a brief loading state
// while storage.js's signInToRemote() fetches the account's Supabase data;
// AppInner is then remounted (via `key`) so every hook's
// `useState(() => loadX())` initializer re-runs against the now-warm cache.
//
// Deliberately does NOT touch or migrate any local/guest data on sign-in —
// there used to be an automatic local-to-cloud merge step here (a
// confirmation prompt, a "syncing your data" overlay, an id/updatedAt merge
// against the account's existing data). That whole flow was removed: it was
// confusing (the prompt and overlay could appear even after declining the
// merge) and its own account-detection signal was unreliable in a way that
// re-triggered AccountSetupFlow on returning sign-ins (see
// remoteProvider.js's initializeRemoteData for the root cause and fix).
// Guest data is simply left alone now; anyone who wants it in their account
// uses the manual JSON/CSV export-then-import feature in Settings > Data.
function App() {
  const { user, loading: authLoading } = useAuth()
  // Starts at 'loading' (skipping the guest paint entirely) rather than
  // always 'guest' when this browser's last successful load was signed in
  // — see storage.js's hasAuthHint for the full reasoning; this is the fix
  // for the reload flicker/reappearing-coach-marks bug. Guests (the common
  // case, hint never set) are completely unaffected: dataMode still starts
  // 'guest' and AppInner still mounts on the very first render, no wait.
  const [dataMode, setDataMode] = useState(() => (hasAuthHint() ? 'loading' : 'guest')) // 'guest' | 'loading' | 'remote'
  // Deliberately its own piece of state rather than derived from `user`/
  // `dataMode` at render time (e.g. `user ? user.id : 'guest'`). Deriving it
  // that way used to remount AppInner the instant `user` flipped to null —
  // which happens *before* the effect below has actually called
  // signOutFromRemote(). Since a `key` change unmounts/remounts synchronously
  // within that same render, the fresh AppInner's hooks (useInventory etc.)
  // ran their `useState(() => loadX())` initializers while activeProvider
  // was still remoteProvider and its cache hadn't been cleared yet — so the
  // "guest" remount silently kept reading the just-signed-out account's
  // data. Setting appKey explicitly, only after signOutFromRemote()/
  // signInToRemote() have already run inside the effect, guarantees the
  // remount can never race ahead of the provider switch.
  const [appKey, setAppKey] = useState('guest')
  const [dataError, setDataError] = useState(null)
  // AccountSetupFlow's trigger — see remoteProvider.js's initializeRemoteData
  // for what "new account" actually means here. Read only once, by AppInner's
  // own lazy useState initializer (see below), at the exact moment AppInner
  // (re)mounts for this sign-in — so it naturally fires once per real
  // sign-in and never again on a later reload/sign-in to the same account.
  const [isNewAccount, setIsNewAccount] = useState(false)
  const prevUserIdRef = useRef(undefined)

  useEffect(() => {
    if (authLoading) return
    const userId = user?.id ?? null
    if (userId === prevUserIdRef.current) return
    prevUserIdRef.current = userId

    if (!userId) {
      signOutFromRemote()
      setDataMode('guest')
      setAppKey('guest')
      // This error is about *this* signed-in session — carrying it across a
      // sign-out (and into whatever account signs in next) would misreport a
      // previous session's outcome as the new one's.
      setDataError(null)
      setIsNewAccount(false)
      // A genuinely signed-out browser should get the fast guest path on its
      // next reload too, not keep paying for the 'loading' gate.
      clearAuthHint()
      return
    }

    let cancelled = false
    setDataError(null)
    setDataMode('loading')
    signInToRemote(userId).then((result) => {
      if (cancelled) return
      if (result.error) {
        console.error('Failed to load account data from Supabase:', result.error)
        setDataError(result.error)
        setDataMode('guest') // fall back to local storage for this session
        setAppKey('guest')
        return
      }
      setIsNewAccount(result.isNewAccount)
      setDataMode('remote')
      setAppKey(userId)
      // Marks this browser as "signed in as of last successful load" so the
      // *next* reload's very first render can skip straight to 'loading'
      // instead of guest — see hasAuthHint's own comment.
      setAuthHint()
    })
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  if (dataMode === 'loading') return <LoadingAccountScreen />

  return (
    // Keyed the same as AppInner, and wrapping it (rather than staying at
    // main.jsx's top level, above this whole gate) so language state
    // remounts in lockstep with every other per-account field below —
    // before this, LanguageProvider's language was read once, at the very
    // first ever paint of the whole app, and never revisited: a signed-in
    // account's saved language preference silently never applied on reload
    // (the app just kept whatever guest/auto-detected language it guessed
    // at that first paint), the same class of bug as the theme/coach-mark
    // flicker above but with no visible flicker to notice it by.
    <LanguageProvider key={appKey}>
      {dataError && <ErrorBanner onDismiss={() => setDataError(null)} messageKey="account.loadErrorNotice" />}
      <AppInner key={appKey} isNewAccount={isNewAccount} />
    </LanguageProvider>
  )
}

function GearIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1l-.3-2.5H9.9l-.3 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L5.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.3 2.5h4.2l.3-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Rendered for the brief moment between "we suspect/know this is a signed-in
// browser" and signInToRemote() resolving — AppInner's hooks read storage
// synchronously on mount, so *something* has to gate rendering until
// activeProvider has actually switched over and its cache is warm, or the
// fresh hooks would read stale/wrong data. Deliberately minimal: no message
// text, no spinner. It does apply storage.js's cached last-known theme class
// (getLastThemeHint) though — a plain hardcoded background here would itself
// be a visible flash-of-wrong-theme for any returning user whose real theme
// isn't the default, on top of the swap to their actual theme a moment
// later. Falls back to 'dark' (via themeClassName(null)) the first time
// this browser has ever loaded, same as the app's overall default.
function LoadingAccountScreen() {
  return <div className={`min-h-screen bg-pine ${themeClassName(getLastThemeHint())}`} />
}

function ErrorBanner({ messageKey, onDismiss }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 text-xs font-sans bg-tomato/15 text-tomato">
      <span>{t(messageKey)}</span>
      <button type="button" onClick={onDismiss} aria-label={t('account.dismissAria')} className="leading-none">
        ×
      </button>
    </div>
  )
}

// The actual app — unchanged from before the auth/storage-provider work,
// except that it's now mounted under App's gate above instead of being the
// top-level export. Every hook here calls storage.js's loadX()/saveX()
// exactly as before; which provider (localStorage vs Supabase) those hit is
// entirely decided by App, before this component ever mounts.
function AppInner({ isNewAccount }) {
  // Needed here (not just in the outer App()/SettingsModal/ProfileMenu,
  // which each already call it independently) for the guest sign-up nudge
  // below and for gating category creation — a Context hook, so calling it
  // again from a different component is normal, not prop-drilling.
  const { user } = useAuth()
  const inventoryApi = useInventory()
  const todayApi = useTodayTasks()
  // isNewAccount defers default-category seeding until AccountSetupFlow
  // finishes (see useCategories' own comment) — irrelevant for guests/
  // returning accounts, which are never isNewAccount and seed immediately.
  const categoriesApi = useCategories(isNewAccount)
  // Lifted up from TodoToday (design-mockups/07): AvailablePomodoros and
  // Timetable moved to Planning's secondary column, as Inventory's
  // neighbors rather than TodoToday's children, so the hook has to live
  // somewhere both TodoToday and the secondary column can reach — App is
  // that shared ancestor, same reasoning as every other hook here.
  const timetableApi = useTimetable()
  const streak = useStreak()
  const [streakDetailsOpen, setStreakDetailsOpen] = useState(false)
  const { t, localeTag } = useTranslation()
  const [activeTab, setActiveTab] = useState('timer')

  // Settings is a modal now (design-mockups/05's sidebar-categorized dialog),
  // not a fourth tab — it no longer occupies an activeTab value at all.
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Which SettingsModal category to land on when it opens — 'general' via
  // the header gear icon (see its onClick below), or 'data' via the "+ Add
  // category" shortcut inside CategoryTagPicker (Inventory/Today's Tasks/
  // Records Log), so a user assigning categories to a task isn't left to
  // find Categories management on their own. SettingsModal only reads this
  // once, as its initial state — it's a fresh mount each time the modal
  // opens (conditionally rendered below), so setting this right before
  // setSettingsOpen(true) is enough.
  const [settingsInitialCategory, setSettingsInitialCategory] = useState('general')
  // useCallback (stable identity, [] deps — only ever touches setState
  // functions) so this stays referentially stable across an unrelated
  // re-render — Inventory/TodoToday/RecordsLog are now memo()'d and take
  // this as a prop, so a fresh identity here every render would silently
  // defeat that memoization.
  const openCategoryManager = useCallback(() => {
    setSettingsInitialCategory('data')
    setSettingsOpen(true)
  }, [])

  const [theme, setTheme] = useState(() => loadSettings().theme)

  function selectTheme(next) {
    setTheme(next)
    patchSettings({ theme: next })
  }

  // Only meaningful when theme === 'custom': General covers every screen
  // except the Timer, which instead picks Focus/Short Break/Long Break by
  // whichever session type is currently active (see the resolved
  // rootThemeId/timerThemeId below, and Timer.jsx's own note on how it
  // applies timerTheme to just its own subtree).
  const [customThemeGeneral, setCustomThemeGeneralState] = useState(() => loadSettings().customThemeGeneral)
  const [customThemeFocus, setCustomThemeFocusState] = useState(() => loadSettings().customThemeFocus)
  const [customThemeShortBreak, setCustomThemeShortBreakState] = useState(
    () => loadSettings().customThemeShortBreak
  )
  const [customThemeLongBreak, setCustomThemeLongBreakState] = useState(
    () => loadSettings().customThemeLongBreak
  )
  function setCustomThemeGeneral(next) {
    setCustomThemeGeneralState(next)
    patchSettings({ customThemeGeneral: next })
  }
  function setCustomThemeFocus(next) {
    setCustomThemeFocusState(next)
    patchSettings({ customThemeFocus: next })
  }
  function setCustomThemeShortBreak(next) {
    setCustomThemeShortBreakState(next)
    patchSettings({ customThemeShortBreak: next })
  }
  function setCustomThemeLongBreak(next) {
    setCustomThemeLongBreakState(next)
    patchSettings({ customThemeLongBreak: next })
  }

  // Custom Fullscreen Focus Mode background (signed-in only — see
  // SettingsModal's `user &&` gate and backgroundStorage.js). App only owns
  // the settings-persisted path; the actual Storage upload/remove calls
  // happen in SettingsModal itself (same pattern as its existing direct
  // storage.js calls for the Danger Zone), which then calls this setter
  // with the resulting path. Always shown without a dimming overlay — the
  // image is shown as-is.
  const [fullscreenBackgroundPath, setFullscreenBackgroundPathState] = useState(
    () => loadSettings().fullscreenBackgroundPath
  )
  function setFullscreenBackgroundPath(path) {
    setFullscreenBackgroundPathState(path)
    patchSettings({ fullscreenBackgroundPath: path })
  }

  // "Check to bottom" (Settings): when on, a completed task moves to the end
  // of its list (see handleFinishTask below) instead of staying in place.
  // Default off, preserving the original behavior unless opted in.
  const [checkToBottom, setCheckToBottomState] = useState(() => loadSettings().checkToBottom)
  function setCheckToBottom(value) {
    setCheckToBottomState(value)
    patchSettings({ checkToBottom: value })
  }

  // Header's personalized greeting (Settings > General) — a plain local
  // preference, not tied to auth, so it works the same for guests and
  // signed-in users. Empty means "not set", which hides the greeting
  // entirely rather than showing "Hello, !".
  const [displayName, setDisplayNameState] = useState(() => loadSettings().displayName)
  function setDisplayName(value) {
    setDisplayNameState(value)
    patchSettings({ displayName: value })
  }

  // How many Pomodoros the user is aiming for per day — captured (optionally)
  // in AccountSetupFlow's last step, also editable afterward in Settings.
  // null means "never set" (see storage.js's DEFAULT_SETTINGS comment).
  const [dailyPomodoroGoal, setDailyPomodoroGoalState] = useState(() => loadSettings().dailyPomodoroGoal)
  function setDailyPomodoroGoal(value) {
    setDailyPomodoroGoalState(value)
    patchSettings({ dailyPomodoroGoal: value })
  }

  // First-time account setup wizard (see AccountSetupFlow.jsx) — seeded once
  // from the `isNewAccount` prop (itself derived in remoteProvider.js's
  // initializeRemoteData) via this lazy useState initializer, so it's true
  // for exactly the one AppInner mount that follows a brand-new account's
  // first-ever sign-in, and never again on a later reload/remount of an
  // already-set-up account. Deliberately a *different* mechanism from the
  // coach-mark system below — see coachMarksSuppressed, which keeps the two
  // from ever showing at the same time.
  const [showAccountSetup, setShowAccountSetup] = useState(() => isNewAccount)

  // GuestSignupNudge (see GuestSignupNudge.jsx) — a one-time product nudge,
  // deliberately a *different* mechanism from both AccountSetupFlow above
  // and the coach-mark system below: guest-only (mutually exclusive with
  // AccountSetupFlow, which only ever fires for a just-signed-in account),
  // and tracked via storage.js's own dedicated localStorage flag rather than
  // seenCoachMarks, since it has no business ever being part of a synced
  // account's settings (see hasSeenGuestSignupNudge's own comment). Owns its
  // own AuthModal instance, same pattern as SettingsModal/ProfileMenu each
  // independently doing the same rather than threading one shared modal
  // through props.
  const [guestNudgeSeen, setGuestNudgeSeenState] = useState(() => hasSeenGuestSignupNudge())
  const [guestNudgeAuthModalOpen, setGuestNudgeAuthModalOpen] = useState(false)
  function dismissGuestNudge() {
    setGuestNudgeSeenState(true)
    markGuestSignupNudgeSeen()
  }

  // Contextual onboarding coach marks (see constants.js's COACH_MARKS/
  // pickCoachMark) — several short, event-triggered hints per core section
  // (Timer/Planning/Reports/Settings), each shown at most once. This
  // replaces the old single first-launch "welcome card" entirely (Timer's
  // first coach mark — 'timer-intro' — now covers that same "here's the
  // idea, add a task and press Start" moment).
  // `seenCoachMarks` holds the ids already dismissed/engaged with; dismissing
  // or clicking "Learn more" on any of them both mark it seen (so it never
  // reappears) — "Learn more" additionally opens MethodologyGuideModal at
  // that mark's most relevant topic.
  const [seenCoachMarks, setSeenCoachMarksState] = useState(() => loadSettings().seenCoachMarks)
  // Reads the previous value from the functional setState updater instead of
  // a separate loadSettings() call — patchSettings() already does its own
  // internal loadSettings() to merge onto, so the old explicit call here was
  // reading the exact same data a second time for no reason. `next` is also
  // reused for both the state update and the persisted value, so the two
  // never have a chance to disagree.
  // useCallback ([] deps — only closes over the stable setState function and
  // the module-level patchSettings import) so this stays referentially
  // stable across an unrelated re-render — Reports is now memo()'d and takes
  // this as onDismissCoachMark, so a fresh identity here every render would
  // silently defeat that memoization.
  const markCoachMarkSeen = useCallback((id) => {
    setSeenCoachMarksState((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id]
      patchSettings({ seenCoachMarks: next })
      return next
    })
  }, [])
  function replayCoachMarks() {
    setSeenCoachMarksState([])
    patchSettings({ seenCoachMarks: [] })
  }
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideInitialSection, setGuideInitialSection] = useState(null)
  // useCallback — see markCoachMarkSeen above; openGuide is itself a
  // dependency of onLearnMoreCoachMark below, which is also passed to
  // memo()'d Reports.
  const openGuide = useCallback((sectionId) => {
    setGuideInitialSection(sectionId ?? null)
    setGuideOpen(true)
  }, [])
  // "Learn more" always both marks the mark seen and opens the guide at its
  // most relevant topic — shared by every section (Timer computes its own
  // mark id internally, so it gets this generic id-taking version too).
  // useCallback: passed to memo()'d Reports as onLearnMoreCoachMark.
  const onLearnMoreCoachMark = useCallback(
    (id) => {
      const mark = COACH_MARKS.find((m) => m.id === id)
      markCoachMarkSeen(id)
      openGuide(mark.guideSection)
    },
    [markCoachMarkSeen, openGuide]
  )

  const activeTask = todayApi.tasks.find((t) => t.id === todayApi.activeTaskId)

  // Memoized so AvailablePomodoros (now memo()'d) doesn't recompute — and,
  // since both are plain numbers, doesn't even see a "changed" prop — on an
  // unrelated re-render (e.g. the once-a-second Pomodoro tick above) when
  // neither todayApi.tasks nor timetableApi.blocks actually changed.
  const plannedTotal = useMemo(
    () => todayApi.tasks.reduce((sum, task) => sum + (task.estimate || 0), 0),
    [todayApi.tasks]
  )
  const suggestedHours = useMemo(() => totalTimetableHours(timetableApi.blocks), [timetableApi.blocks])

  // Envanterden normal planlamayla gelen bir görev "urgent" değildir —
  // Unplanned & Urgent bölümü sadece gün içinde aniden çıkan işler için.
  // Category tags and notes carry over from the Inventory item, per the
  // request that copying a task to Today shouldn't lose either.
  // useCallback: passed to memo()'d Inventory as onSendToToday — a fresh
  // identity every render would defeat that memoization (see Inventory.jsx).
  const handleSendToToday = useCallback(
    (item) => {
      todayApi.addTask(item.text, item.estimate, {
        inventoryId: item.id,
        unplanned: item.unplanned,
        categoryIds: item.categoryIds,
        notes: item.notes,
      })
    },
    // react-hooks/exhaustive-deps can't see that todayApi.addTask (a
    // useCallback with [] deps inside useTodayTasks.js) is individually
    // stable even though the todayApi object it lives on is a fresh literal
    // every render — it only knows how to ask for the whole object, which
    // would defeat the point of this useCallback (see the comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayApi.addTask]
  )

  // Görev bittiğinde, eğer envanterden geldiyse envanterden de siliyoruz
  // (kitaptaki "tamamlanan işleri envanterden sil" kuralına uygun).
  // Bu, timer'dan tamamen bağımsız — bir görevi bitirmek çalışan Pomodoro'yu
  // durdurmaz (overlearning için kalan süre kullanılabilir).
  // useCallback: passed to memo()'d TodoToday as finishTask — same
  // referential-stability reasoning as handleSendToToday above. Deliberately
  // depends on todayApi.tasks/todayApi.finishTask (both change only when
  // tasks actually change, not on every unrelated re-render), so this still
  // gets a fresh identity exactly when TodoToday needs to re-render anyway.
  const handleFinishTask = useCallback(
    (id) => {
      const task = todayApi.tasks.find((t) => t.id === id)
      todayApi.finishTask(id)
      if (checkToBottom) todayApi.moveTaskToEnd(id)
      if (task?.inventoryId) inventoryApi.removeItem(task.inventoryId)
    },
    // Same react-hooks/exhaustive-deps limitation as handleSendToToday above
    // — todayApi.finishTask/moveTaskToEnd and inventoryApi.removeItem are
    // each individually stable (or, for finishTask, deliberately re-created
    // only when todayApi.tasks itself changes); the lint rule can't verify
    // that and would rather see the whole (per-render-fresh) todayApi/
    // inventoryApi objects, which would break the stability this exists for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayApi.tasks, todayApi.finishTask, checkToBottom, todayApi.moveTaskToEnd, inventoryApi.removeItem]
  )

  // Instantiated here (not inside Timer) so the countdown keeps running and
  // stays controllable from the Settings tab regardless of which tab is
  // currently shown — see the "hidden, not unmounted" tab panels below.
  const pomodoro = usePomodoro({
    onWorkComplete: () => {
      if (todayApi.activeTaskId) todayApi.incrementRealized(todayApi.activeTaskId)
    },
    onInterruption: (kind, delta) => {
      if (todayApi.activeTaskId) todayApi.addInterruption(todayApi.activeTaskId, kind, delta)
    },
    // Void reason logging: a simple daily-journal entry (task/category/elapsed
    // time/optional reason), deliberately never read by Reports — see
    // storage.js's pomodoro_void_log comment.
    onVoid: ({ reason, elapsedSeconds }) => {
      const task = todayApi.tasks.find((t) => t.id === todayApi.activeTaskId)
      addVoidLogEntry({
        id: crypto.randomUUID(),
        date: todayString(),
        time: nowTime(),
        activity: task ? task.text : null,
        categoryIds: task ? task.categoryIds : [],
        elapsedSeconds,
        reason,
      })
    },
    t,
  })

  // GuestSignupNudge's trigger: a guest's first-ever Pomodoro (work session)
  // actually starting — mirrors the 'timer-first-start' coach mark's own
  // condition, just additionally scoped to `!user` and gated on the
  // separate guestNudgeSeen flag instead of seenCoachMarks. Rendered as a
  // fixed corner card (see GuestSignupNudge.jsx) independent of activeTab,
  // so it persists across tab switches like a normal toast/notification
  // until dismissed or acted on.
  const showGuestNudge = !user && !guestNudgeSeen && pomodoro.isRunning && pomodoro.sessionType === 'work'

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  const today = now.toLocaleDateString(localeTag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  // hour12 intentionally omitted (not forced to true) — Intl picks the
  // locale-appropriate default: 12-hour for en-US, 24-hour for tr-TR.
  const time = now.toLocaleTimeString(localeTag, {
    hour: 'numeric',
    minute: '2-digit',
  })

  // 'custom' isn't a real CSS-backed palette itself — it resolves to one of
  // the five real theme ids depending on *where* it's applied: General for
  // the app shell (header, Planning, Reports, Settings — everything this
  // root div wraps other than Timer), or whichever of Focus/Short Break/
  // Long Break matches the session that's currently running for the Timer
  // specifically (see the `timerThemeId` passed down below).

  // While AccountSetupFlow is open, no coach mark anywhere should render
  // underneath/behind it — passed down to Timer/Reports/SettingsModal (which
  // each compute their own mark via pickCoachMark internally) as a plain
  // boolean; Planning's mark is computed right here in App, so it's gated
  // the same way inline. Once the flow closes, normal triggers resume
  // immediately (e.g. 'timer-intro' shows right away), same as for anyone
  // else — nothing about a coach mark's own seen/trigger state is touched by
  // this, it's purely a "don't render" gate.
  const coachMarksSuppressed = showAccountSetup

  // Planning's coach mark is computed here (rather than inside TodoToday/
  // Inventory) since App is the shared ancestor that already has
  // todayApi.tasks — see constants.js's pickCoachMark for the trigger rules.
  const planningCoachMark = coachMarksSuppressed
    ? null
    : pickCoachMark('planning', seenCoachMarks, {
        'planning-first-today-task': todayApi.tasks.length > 0,
      })

  const rootThemeId = theme === 'custom' ? customThemeGeneral : theme

  // Keeps App()'s LoadingAccountScreen's best-guess background current —
  // see storage.js's setLastThemeHint. Runs for guests too (harmless,
  // just keeps the guess fresh in case this browser signs in later); the
  // real, authoritative theme always wins the instant it's actually known,
  // this only affects what's painted for the brief window before that.
  useEffect(() => {
    setLastThemeHint(themeClassName(rootThemeId))
  }, [rootThemeId])

  const timerThemeId =
    theme === 'custom'
      ? { work: customThemeFocus, shortBreak: customThemeShortBreak, longBreak: customThemeLongBreak }[
          pomodoro.sessionType
        ]
      : theme

  return (
    <div className={`min-h-screen bg-pine ${themeClassName(rootThemeId)}`}>
      {/* Mobile: plain flex-wrap (logo+time / right cluster on row 1, nav
          pushed to row 2 via order-3). Desktop: an explicit 3-column grid,
          `1fr auto 1fr` — nav sits in the middle `auto` column (sized to its
          own content) while the two `1fr` side columns always split the
          *remaining* space exactly evenly, whatever their own content's
          width — that's what keeps nav truly centered regardless of how
          long the header greeting or the left group get, unlike an
          `auto 1fr auto` split (where nav's own column would shrink/grow
          and drag its centered content off the header's true midpoint) or
          plain flex with `ml-auto`/`mx-auto` (auto-margins split leftover
          space across every one, not per-item). `justify-self-start/end` on
          the two side groups stops them stretching to fill their track. */}
      <header className="border-b border-cream/10 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-x-6 sm:gap-y-0">
        <div className="flex items-center gap-4 flex-shrink-0 sm:justify-self-start">
          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            aria-label={t('header.homeAria')}
            title={t('header.homeAria')}
            className="group flex items-center gap-3 flex-shrink-0"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-tomato flex-shrink-0" />
            <p className="text-sage text-xs font-sans tracking-widest uppercase whitespace-nowrap transition-colors group-hover:text-cream">
              {t('common.appTitle')}
            </p>
          </button>
          <p className="text-sage text-xs font-sans whitespace-nowrap">
            {today} · {time}
          </p>
        </div>

        <TabNav activeTab={activeTab} onChange={setActiveTab} className="order-3 w-full sm:order-none sm:w-auto" />

        <div className="flex items-center gap-3 ml-auto flex-shrink-0 sm:justify-self-end">
          {displayName.trim() && (
            <p className="text-cream text-xs font-sans whitespace-nowrap hidden sm:block">
              {t('header.greeting', { name: displayName.trim() })}
            </p>
          )}
          {/* Real streak counter (src/hooks/useStreak.js) — dim/sage-toned
              until today's Pomodoro is done (the "gray flame" convention),
              tomato-bold once it is. Click opens StreakDetailsModal;
              StreakCelebration overlays a one-shot animation on top when
              useStreak reports a fresh increment/milestone. */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setStreakDetailsOpen(true)}
              aria-label={t('header.streakAria')}
              title={t('header.streakAria')}
              className={
                'flex items-center gap-1 text-xs font-sans tabular-nums leading-none ' +
                (streak.todayDone ? 'text-tomato' : 'text-sage')
              }
            >
              <span>🍅</span>
              <span>{streak.currentStreak}</span>
            </button>
            <StreakCelebration
              celebration={streak.celebration}
              streak={streak.currentStreak}
              onDone={streak.clearCelebration}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSettingsInitialCategory('general')
              setSettingsOpen(true)
            }}
            aria-label={t('header.settingsAria')}
            title={t('header.settingsAria')}
            className={'text-sage hover:text-cream flex-shrink-0 ' + (settingsOpen ? 'text-tomato' : '')}
          >
            <GearIcon className="w-4 h-4" />
          </button>
          <ProfileMenu />
        </div>
      </header>

      {/* All four panels stay mounted — only the active one is shown (CSS
          `hidden`, not conditional rendering). Unmounting the Timer panel on
          every tab switch would stop usePomodoro's countdown interval while
          away, effectively pausing a running Pomodoro; unmounting Reports/
          RecordsLog would drop and re-subscribe their storage listeners on
          every switch. "Not visible while working" only requires display:none,
          not unmounting. */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Themed + given a floor height here (not just inside Timer.jsx)
            so that in Custom mode, when the active session's theme differs
            from General, the colored area covers the whole tab instead of
            just Timer's own tightly-fit content box — otherwise a short
            Timer on a tall viewport would show a seam of the *General*
            theme's background peeking through around it. */}
        <div
          className={
            activeTab === 'timer'
              ? `flex justify-center bg-pine min-h-[80vh] ${themeClassName(timerThemeId)}`
              : 'hidden'
          }
        >
          <Timer
            activeTask={activeTask}
            addTask={todayApi.addTask}
            theme={timerThemeId}
            onGoToPlanning={() => setActiveTab('planning')}
            onNavigateTab={setActiveTab}
            fullscreenBackgroundPath={fullscreenBackgroundPath}
            seenCoachMarks={seenCoachMarks}
            onDismissCoachMark={markCoachMarkSeen}
            onLearnMoreCoachMark={onLearnMoreCoachMark}
            coachMarksSuppressed={coachMarksSuppressed}
            {...pomodoro}
          />
        </div>

        <div
          className={activeTab === 'planning' ? 'flex flex-col gap-6' : 'hidden'}
        >
          {planningCoachMark && (
            <CoachMark
              titleKey={planningCoachMark.titleKey}
              bodyKey={planningCoachMark.bodyKey}
              onDismiss={() => markCoachMarkSeen(planningCoachMark.id)}
              onLearnMore={() => onLearnMoreCoachMark(planningCoachMark.id)}
            />
          )}
          {/* Capacity/schedule strip (design-mockups/08): AvailablePomodoros and
              Timetable are compact form+list widgets, not backlog-sized
              content, so they get a horizontal row of their own above the
              main lists rather than stacking inside a narrow sidebar column
              — that old layout squeezed Inventory (which can grow just as
              long as Today's Tasks) down to 320px and pushed it below both
              widgets vertically. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AvailablePomodoros plannedTotal={plannedTotal} suggestedHours={suggestedHours} />
            <Timetable
              blocks={timetableApi.blocks}
              addBlock={timetableApi.addBlock}
              removeBlock={timetableApi.removeBlock}
            />
          </div>

          {/* Today's Tasks and Inventory are both task lists of comparable
              weight — one is the backlog, the other the committed plan for
              the day — so they now sit in equal-width columns instead of
              Today's Tasks dominating a 1fr column with Inventory
              squeezed into a fixed 320px one. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TodoToday
              tasks={todayApi.tasks}
              activeTaskId={todayApi.activeTaskId}
              setActiveTaskId={todayApi.setActiveTaskId}
              addTask={todayApi.addTask}
              removeTask={todayApi.removeTask}
              clearFinishedTasks={todayApi.clearFinishedTasks}
              clearAllTasks={todayApi.clearAllTasks}
              updateTask={todayApi.updateTask}
              reestimateTask={todayApi.reestimateTask}
              finishTask={handleFinishTask}
              categories={categoriesApi.categories}
              onManageCategories={openCategoryManager}
            />
            <Inventory
              items={inventoryApi.items}
              addItem={inventoryApi.addItem}
              removeItem={inventoryApi.removeItem}
              toggleDone={inventoryApi.toggleDone}
              updateItem={inventoryApi.updateItem}
              combineItems={inventoryApi.combineItems}
              onSendToToday={handleSendToToday}
              categories={categoriesApi.categories}
              onManageCategories={openCategoryManager}
            />
          </div>
        </div>

        <div
          className={activeTab === 'reports' ? 'max-w-3xl mx-auto flex flex-col gap-6' : 'hidden'}
        >
          <Reports
            todayTasks={todayApi.tasks}
            categories={categoriesApi.categories}
            workMinutes={pomodoro.workMinutes}
            dailyPomodoroGoal={dailyPomodoroGoal}
            seenCoachMarks={seenCoachMarks}
            onDismissCoachMark={markCoachMarkSeen}
            onLearnMoreCoachMark={onLearnMoreCoachMark}
            coachMarksSuppressed={coachMarksSuppressed}
          />
          <RecordsLog categories={categoriesApi.categories} onManageCategories={openCategoryManager} />
        </div>

      </main>

      {streakDetailsOpen && (
        <StreakDetailsModal
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          freezeAvailable={streak.freezeAvailable}
          daysUntilNextFreeze={streak.daysUntilNextFreeze}
          nextMilestone={streak.nextMilestone}
          recentDays={streak.recentDays}
          onClose={() => setStreakDetailsOpen(false)}
        />
      )}

      {settingsOpen && (
        // fallback dims the screen immediately (matching SettingsModal's own
        // eventual bg-black/60 backdrop) instead of a blank gap while the
        // lazy chunk loads — see the `lazy(...)` import above.
        <Suspense fallback={<div className="fixed inset-0 bg-black/60 z-50" />}>
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          initialCategory={settingsInitialCategory}
          cycleLength={pomodoro.cycleLength}
          setCycleLength={pomodoro.setCycleLength}
          resetCycleLength={pomodoro.resetCycleLength}
          workMinutes={pomodoro.workMinutes}
          setWorkMinutes={pomodoro.setWorkMinutes}
          shortBreakMinutes={pomodoro.shortBreakMinutes}
          setShortBreakMinutes={pomodoro.setShortBreakMinutes}
          longBreakMinutes={pomodoro.longBreakMinutes}
          setLongBreakMinutes={pomodoro.setLongBreakMinutes}
          autoStartBreaks={pomodoro.autoStartBreaks}
          setAutoStartBreaks={pomodoro.setAutoStartBreaks}
          autoStartPomodoros={pomodoro.autoStartPomodoros}
          setAutoStartPomodoros={pomodoro.setAutoStartPomodoros}
          categories={categoriesApi.categories}
          addCategory={categoriesApi.addCategory}
          updateCategory={categoriesApi.updateCategory}
          removeCategory={categoriesApi.removeCategory}
          chimeStyle={pomodoro.chimeStyle}
          setChimeStyle={pomodoro.setChimeStyle}
          soundVolume={pomodoro.soundVolume}
          setSoundVolume={pomodoro.setSoundVolume}
          ambientVolume={pomodoro.ambientVolume}
          setAmbientVolume={pomodoro.setAmbientVolume}
          ambientSound={pomodoro.ambientSound}
          setAmbientSound={pomodoro.setAmbientSound}
          checkToBottom={checkToBottom}
          setCheckToBottom={setCheckToBottom}
          displayName={displayName}
          setDisplayName={setDisplayName}
          dailyPomodoroGoal={dailyPomodoroGoal}
          setDailyPomodoroGoal={setDailyPomodoroGoal}
          theme={theme}
          onSelectTheme={selectTheme}
          customThemeGeneral={customThemeGeneral}
          setCustomThemeGeneral={setCustomThemeGeneral}
          customThemeFocus={customThemeFocus}
          setCustomThemeFocus={setCustomThemeFocus}
          customThemeShortBreak={customThemeShortBreak}
          setCustomThemeShortBreak={setCustomThemeShortBreak}
          customThemeLongBreak={customThemeLongBreak}
          setCustomThemeLongBreak={setCustomThemeLongBreak}
          fullscreenBackgroundPath={fullscreenBackgroundPath}
          setFullscreenBackgroundPath={setFullscreenBackgroundPath}
          seenCoachMarks={seenCoachMarks}
          onDismissCoachMark={markCoachMarkSeen}
          onLearnMoreCoachMark={onLearnMoreCoachMark}
          coachMarksSuppressed={coachMarksSuppressed}
          onOpenGuide={openGuide}
          onReplayCoachMarks={replayCoachMarks}
        />
        </Suspense>
      )}

      {showAccountSetup && (
        <AccountSetupFlow
          // seedIfNeeded runs here, not earlier — this is the deterministic
          // point where the wizard's own language step (if the user touched
          // it) has already been persisted via setLanguage/patchSettings, so
          // seedDefaultCategories() picks up the language the user actually
          // ended up with instead of whatever the browser auto-detected
          // before they had a chance to choose. See useCategories.js.
          onFinish={() => {
            setShowAccountSetup(false)
            categoriesApi.seedIfNeeded()
          }}
          displayName={displayName}
          setDisplayName={setDisplayName}
          theme={theme}
          onSelectTheme={selectTheme}
          dailyPomodoroGoal={dailyPomodoroGoal}
          setDailyPomodoroGoal={setDailyPomodoroGoal}
        />
      )}

      {guideOpen && (
        <MethodologyGuideModal
          onClose={() => setGuideOpen(false)}
          initialSectionId={guideInitialSection}
        />
      )}

      {showGuestNudge && (
        <GuestSignupNudge
          onDismiss={dismissGuestNudge}
          onSignUp={() => {
            dismissGuestNudge()
            setGuestNudgeAuthModalOpen(true)
          }}
        />
      )}
      {guestNudgeAuthModalOpen && (
        <AuthModal initialMode="signUp" onClose={() => setGuestNudgeAuthModalOpen(false)} />
      )}
    </div>
  )
}

export default App
