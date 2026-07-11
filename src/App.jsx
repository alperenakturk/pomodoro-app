import { useState, useEffect, useRef } from 'react'
import { useInventory } from './hooks/useInventory'
import { useTodayTasks } from './hooks/useTodayTasks'
import { usePomodoro } from './hooks/usePomodoro'
import { useCategories } from './hooks/useCategories'
import { useTimetable } from './hooks/useTimetable'
import { useAuth } from './hooks/useAuth'
import {
  loadSettings,
  patchSettings,
  addVoidLogEntry,
  loadActivityLog,
  loadTicks,
  signInToRemote,
  signOutFromRemote,
  clearLocalGuestData,
  hasLocalGuestData,
} from './lib/storage'
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

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

// Auth-transition gate + notice banners live here, one level above the
// actual app tree (AppInner) — see CLAUDE.md's Authentication section for
// the full reasoning. In short: guest usage (the common case) never waits
// on anything, since AppInner mounts immediately in local mode before
// useAuth's initial session check even resolves. Only an *actual* sign-in
// (user goes from null to a real session) pays for a brief "Syncing…"
// state while storage.js's signInToRemote() fetches + merges Supabase data;
// AppInner is then remounted (via `key`) so every hook's
// `useState(() => loadX())` initializer re-runs against the now-warm cache.
function App() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const [dataMode, setDataMode] = useState('guest') // 'guest' | 'syncing' | 'remote'
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
  const [syncNotice, setSyncNotice] = useState(null)
  const [syncError, setSyncError] = useState(null)
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
      // Both notices are about *this* signed-in session — carrying either
      // one across a sign-out (and into whatever account signs in next)
      // would misreport a previous session's outcome as the new one's.
      setSyncNotice(null)
      setSyncError(null)
      return
    }

    let cancelled = false
    setSyncError(null)
    setSyncNotice(null)

    // Resolved *before* the syncing screen shows — this is a decision only
    // the user can make, so it needs to happen while the app still looks
    // normal, not mid-"Syncing…" transition. An empty/untouched guest
    // session (hasLocalGuestData() false) has nothing to ask about and
    // proceeds silently, exactly as before this feature existed.
    const skipLocalMerge = hasLocalGuestData() && !window.confirm(t('sync.mergePromptConfirm'))

    setDataMode('syncing')
    signInToRemote(userId, { skipLocalMerge }).then((result) => {
      if (cancelled) return
      if (result.error) {
        console.error('Failed to sync with Supabase:', result.error)
        setSyncError(result.error)
        setDataMode('guest') // fall back to local storage for this session
        setAppKey('guest')
        return
      }
      if (result.migrated) {
        clearLocalGuestData()
        setSyncNotice(true)
      }
      setDataMode('remote')
      setAppKey(userId)
    })
    return () => {
      cancelled = true
    }
  }, [user, authLoading, t])

  if (dataMode === 'syncing') return <SyncingScreen />

  return (
    <>
      {syncError && <NoticeBanner tone="error" onDismiss={() => setSyncError(null)} messageKey="sync.errorNotice" />}
      {syncNotice && (
        <NoticeBanner tone="success" onDismiss={() => setSyncNotice(null)} messageKey="sync.migratedNotice" />
      )}
      <AppInner key={appKey} />
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

function SyncingScreen() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-pine flex items-center justify-center">
      <p className="text-sage text-sm font-sans">{t('sync.syncingMessage')}</p>
    </div>
  )
}

function NoticeBanner({ tone, messageKey, onDismiss }) {
  const { t } = useTranslation()
  return (
    <div
      className={
        'flex items-center justify-between gap-3 px-4 sm:px-6 py-2 text-xs font-sans ' +
        (tone === 'error' ? 'bg-tomato/15 text-tomato' : 'bg-sage/15 text-sage')
      }
    >
      <span>{t(messageKey)}</span>
      <button type="button" onClick={onDismiss} aria-label={t('sync.dismissAria')} className="leading-none">
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
function AppInner() {
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

  // First-launch welcome card (Timer tab): shown only while every collection
  // is still empty AND the user hasn't already dismissed it — so it appears
  // once on a fresh install and never resurfaces afterward, even if the user
  // later clears their data via the Danger Zone.
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => loadSettings().onboardingDismissed
  )
  // Transient (not persisted) — lets Settings' "Show welcome message again"
  // bring the card back even for a user who already has data, which the
  // isAllDataEmpty condition alone would never allow. Cleared again on
  // dismiss so it behaves like a one-time replay, not a second permanent
  // on state.
  const [welcomeReplay, setWelcomeReplay] = useState(false)
  function dismissOnboarding() {
    setOnboardingDismissed(true)
    patchSettings({ onboardingDismissed: true })
    setWelcomeReplay(false)
  }
  function replayWelcome() {
    setWelcomeReplay(true)
    setActiveTab('timer')
    setSettingsOpen(false)
  }
  const isAllDataEmpty =
    inventoryApi.items.length === 0 &&
    todayApi.tasks.length === 0 &&
    categoriesApi.categories.length === 0 &&
    loadActivityLog().length === 0 &&
    loadTicks().length === 0
  const showWelcome = (!onboardingDismissed && isAllDataEmpty) || welcomeReplay

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
  const rootThemeId = theme === 'custom' ? customThemeGeneral : theme
  const timerThemeId =
    theme === 'custom'
      ? { work: customThemeFocus, shortBreak: customThemeShortBreak, longBreak: customThemeLongBreak }[
          pomodoro.sessionType
        ]
      : theme

  return (
    <div className={`min-h-screen bg-pine ${themeClassName(rootThemeId)}`}>
      {/* Mobile: plain flex-wrap (logo + right cluster on row 1, nav pushed
          to row 2 via order-3). Desktop: an explicit 3-column grid instead —
          flex with only `ml-auto` on the right cluster and `mx-auto` on nav
          looks similar but isn't true centering: with 3 items sharing the
          row, auto-margins split the *leftover* space between all of them
          (CSS distributes free space across every auto margin present, not
          per-item), so nav lands off-center by however wide the logo is.
          A grid's 1fr center column is centered relative to the whole header
          regardless of the other two columns' widths. */}
      <header className="border-b border-cream/10 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:grid sm:grid-cols-[auto_1fr_auto] sm:gap-x-6 sm:gap-y-0">
        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          aria-label={t('header.homeAria')}
          title={t('header.homeAria')}
          className="flex items-center gap-3 flex-shrink-0"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-tomato flex-shrink-0" />
          <p className="text-sage text-xs font-sans tracking-widest uppercase whitespace-nowrap">
            {t('common.appTitle')}
          </p>
        </button>

        <TabNav activeTab={activeTab} onChange={setActiveTab} className="order-3 w-full sm:order-none sm:w-full" />

        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {displayName.trim() && (
            <p className="text-cream text-xs font-sans whitespace-nowrap hidden sm:block">
              {t('header.greeting', { name: displayName.trim() })}
            </p>
          )}
          <p className="text-sage text-xs font-sans whitespace-nowrap">
            {today} · {time}
          </p>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
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
            showWelcome={showWelcome}
            onDismissWelcome={dismissOnboarding}
            {...pomodoro}
          />
        </div>

        <div
          className={
            activeTab === 'planning'
              ? 'grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start'
              : 'hidden'
          }
        >
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
          />
          <RecordsLog categories={categoriesApi.categories} />
        </div>

      </main>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
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
          ambientSound={pomodoro.ambientSound}
          setAmbientSound={pomodoro.setAmbientSound}
          checkToBottom={checkToBottom}
          setCheckToBottom={setCheckToBottom}
          displayName={displayName}
          setDisplayName={setDisplayName}
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
          onReplayWelcome={replayWelcome}
        />
      )}
    </div>
  )
}

export default App
