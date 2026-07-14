import { useState, useEffect, useRef } from 'react'
import { useInventory } from './hooks/useInventory'
import { useTodayTasks } from './hooks/useTodayTasks'
import { usePomodoro } from './hooks/usePomodoro'
import { useCategories } from './hooks/useCategories'
import { useTimetable } from './hooks/useTimetable'
import { useAuth } from './hooks/useAuth'
import { loadSettings, patchSettings, addVoidLogEntry, signInToRemote, signOutFromRemote } from './lib/storage'
import { useTranslation } from './hooks/useTranslation'
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
import SettingsModal from './components/SettingsModal'
import ProfileMenu from './components/ProfileMenu'
import CoachMark from './components/CoachMark'
import MethodologyGuideModal from './components/MethodologyGuideModal'
import AccountSetupFlow from './components/AccountSetupFlow'
import { COACH_MARKS, pickCoachMark } from './lib/constants'

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
  const [dataMode, setDataMode] = useState('guest') // 'guest' | 'loading' | 'remote'
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
    })
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  if (dataMode === 'loading') return <LoadingAccountScreen />

  return (
    <>
      {dataError && <ErrorBanner onDismiss={() => setDataError(null)} messageKey="account.loadErrorNotice" />}
      <AppInner key={appKey} isNewAccount={isNewAccount} />
    </>
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

// Rendered only for the brief moment between "user id changed" and
// signInToRemote() resolving — AppInner's hooks read storage synchronously
// on mount, so *something* has to gate rendering until activeProvider has
// actually switched over and its cache is warm, or the fresh hooks would
// read stale/wrong data. Deliberately minimal: no message text, no per-guest
// theme resolution (an earlier version tried to match the guest's last-seen
// theme here, purely to avoid a color flash during the old, much slower
// merge-and-confirm flow — not worth the complexity now that this is just a
// plain data fetch, typically well under a second).
function LoadingAccountScreen() {
  return <div className="min-h-screen bg-pine" />
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
  const inventoryApi = useInventory()
  const todayApi = useTodayTasks()
  const categoriesApi = useCategories()
  // Lifted up from TodoToday (design-mockups/07): AvailablePomodoros and
  // Timetable moved to Planning's secondary column, as Inventory's
  // neighbors rather than TodoToday's children, so the hook has to live
  // somewhere both TodoToday and the secondary column can reach — App is
  // that shared ancestor, same reasoning as every other hook here.
  const timetableApi = useTimetable()
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
  function openCategoryManager() {
    setSettingsInitialCategory('data')
    setSettingsOpen(true)
  }

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
  function markCoachMarkSeen(id) {
    setSeenCoachMarksState((prev) => (prev.includes(id) ? prev : [...prev, id]))
    patchSettings({ seenCoachMarks: [...new Set([...loadSettings().seenCoachMarks, id])] })
  }
  function replayCoachMarks() {
    setSeenCoachMarksState([])
    patchSettings({ seenCoachMarks: [] })
  }
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideInitialSection, setGuideInitialSection] = useState(null)
  function openGuide(sectionId) {
    setGuideInitialSection(sectionId ?? null)
    setGuideOpen(true)
  }
  // "Learn more" always both marks the mark seen and opens the guide at its
  // most relevant topic — shared by every section (Timer computes its own
  // mark id internally, so it gets this generic id-taking version too).
  function onLearnMoreCoachMark(id) {
    const mark = COACH_MARKS.find((m) => m.id === id)
    markCoachMarkSeen(id)
    openGuide(mark.guideSection)
  }

  const activeTask = todayApi.tasks.find((t) => t.id === todayApi.activeTaskId)

  // Envanterden normal planlamayla gelen bir görev "urgent" değildir —
  // Unplanned & Urgent bölümü sadece gün içinde aniden çıkan işler için.
  // Category tags and notes carry over from the Inventory item, per the
  // request that copying a task to Today shouldn't lose either.
  function handleSendToToday(item) {
    todayApi.addTask(item.text, item.estimate, {
      inventoryId: item.id,
      unplanned: item.unplanned,
      categoryIds: item.categoryIds,
      notes: item.notes,
    })
  }

  // Görev bittiğinde, eğer envanterden geldiyse envanterden de siliyoruz
  // (kitaptaki "tamamlanan işleri envanterden sil" kuralına uygun).
  // Bu, timer'dan tamamen bağımsız — bir görevi bitirmek çalışan Pomodoro'yu
  // durdurmaz (overlearning için kalan süre kullanılabilir).
  function handleFinishTask(id) {
    const task = todayApi.tasks.find((t) => t.id === id)
    todayApi.finishTask(id)
    if (checkToBottom) todayApi.moveTaskToEnd(id)
    if (task?.inventoryId) inventoryApi.removeItem(task.inventoryId)
  }

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
          {/* Streak placeholder — no real streak tracking yet, just an icon
              that names the future feature when clicked. */}
          <button
            type="button"
            onClick={() => window.alert(t('header.streakComingSoon'))}
            aria-label={t('header.streakAria')}
            title={t('header.streakAria')}
            className="text-sm leading-none flex-shrink-0"
          >
            🍅
          </button>
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Today's Tasks is the dominant panel now (design-mockups/07) —
              Inventory/Available Pomodoros/Timetable moved to a narrower,
              compact secondary column alongside it, reversed from the old
              Inventory-first layout. */}
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

          <div className="flex flex-col gap-4">
            <AvailablePomodoros
              plannedTotal={todayApi.tasks.reduce((sum, task) => sum + (task.estimate || 0), 0)}
              suggestedHours={totalTimetableHours(timetableApi.blocks)}
            />
            <Timetable
              blocks={timetableApi.blocks}
              addBlock={timetableApi.addBlock}
              removeBlock={timetableApi.removeBlock}
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

      {settingsOpen && (
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
      )}

      {showAccountSetup && (
        <AccountSetupFlow
          onFinish={() => setShowAccountSetup(false)}
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
    </div>
  )
}

export default App
