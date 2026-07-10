import { useState, useEffect } from 'react'
import { useInventory } from './hooks/useInventory'
import { useTodayTasks } from './hooks/useTodayTasks'
import { usePomodoro } from './hooks/usePomodoro'
import { useCategories } from './hooks/useCategories'
import { loadSettings, patchSettings, addVoidLogEntry, loadActivityLog, loadTicks } from './lib/storage'
import { useTranslation } from './hooks/useTranslation'
import Timer from './components/Timer'
import Inventory from './components/Inventory'
import TodoToday from './components/TodoToday'
import RecordsLog from './components/RecordsLog'
import Reports from './components/Reports'
import TabNav from './components/TabNav'
import SettingsTab from './components/SettingsTab'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

function App() {
  const inventoryApi = useInventory()
  const todayApi = useTodayTasks()
  const categoriesApi = useCategories()
  const { t, localeTag } = useTranslation()
  const [activeTab, setActiveTab] = useState('timer')

  const [theme, setTheme] = useState(() => loadSettings().theme)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    patchSettings({ theme: next })
  }

  // First-launch welcome card (Timer tab): shown only while every collection
  // is still empty AND the user hasn't already dismissed it — so it appears
  // once on a fresh install and never resurfaces afterward, even if the user
  // later clears their data via the Danger Zone.
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => loadSettings().onboardingDismissed
  )
  function dismissOnboarding() {
    setOnboardingDismissed(true)
    patchSettings({ onboardingDismissed: true })
  }
  const isAllDataEmpty =
    inventoryApi.items.length === 0 &&
    todayApi.tasks.length === 0 &&
    categoriesApi.categories.length === 0 &&
    loadActivityLog().length === 0 &&
    loadTicks().length === 0
  const showWelcome = !onboardingDismissed && isAllDataEmpty

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

  return (
    <div className={`min-h-screen bg-pine ${theme === 'light' ? 'light' : ''}`}>
      <header className="border-b border-cream/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-tomato flex-shrink-0" />
          <p className="text-sage text-xs font-sans tracking-widest uppercase whitespace-nowrap">
            {t('common.appTitle')}
          </p>
        </div>
        <p className="text-sage text-xs font-sans whitespace-nowrap">
          {today} · {time}
        </p>
      </header>

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      {/* All four panels stay mounted — only the active one is shown (CSS
          `hidden`, not conditional rendering). Unmounting the Timer panel on
          every tab switch would stop usePomodoro's countdown interval while
          away, effectively pausing a running Pomodoro; unmounting Reports/
          RecordsLog would drop and re-subscribe their storage listeners on
          every switch. "Not visible while working" only requires display:none,
          not unmounting. */}
      <main className="max-w-7xl mx-auto p-6">
        <div className={activeTab === 'timer' ? 'flex justify-center' : 'hidden'}>
          <Timer
            activeTask={activeTask}
            addTask={todayApi.addTask}
            theme={theme}
            onGoToPlanning={() => setActiveTab('planning')}
            showWelcome={showWelcome}
            onDismissWelcome={dismissOnboarding}
            {...pomodoro}
          />
        </div>

        <div
          className={
            activeTab === 'planning'
              ? 'grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start'
              : 'hidden'
          }
        >
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
          <TodoToday
            tasks={todayApi.tasks}
            activeTaskId={todayApi.activeTaskId}
            setActiveTaskId={todayApi.setActiveTaskId}
            addTask={todayApi.addTask}
            removeTask={todayApi.removeTask}
            updateTask={todayApi.updateTask}
            reestimateTask={todayApi.reestimateTask}
            finishTask={handleFinishTask}
            categories={categoriesApi.categories}
          />
        </div>

        <div
          className={activeTab === 'reports' ? 'max-w-3xl mx-auto flex flex-col gap-6' : 'hidden'}
        >
          <Reports todayTasks={todayApi.tasks} categories={categoriesApi.categories} />
          <RecordsLog categories={categoriesApi.categories} />
        </div>

        <div className={activeTab === 'settings' ? '' : 'hidden'}>
          <SettingsTab
            cycleLength={pomodoro.cycleLength}
            setCycleLength={pomodoro.setCycleLength}
            resetCycleLength={pomodoro.resetCycleLength}
            categories={categoriesApi.categories}
            addCategory={categoriesApi.addCategory}
            updateCategory={categoriesApi.updateCategory}
            removeCategory={categoriesApi.removeCategory}
            chimeStyle={pomodoro.chimeStyle}
            setChimeStyle={pomodoro.setChimeStyle}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>
      </main>
    </div>
  )
}

export default App
