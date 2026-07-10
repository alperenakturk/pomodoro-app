import { unlockAudio, playChime, CHIME_STYLES } from '../lib/alert'
import { DEFAULT_CYCLE_LENGTH } from '../hooks/usePomodoro'
import {
  clearInventory,
  clearTodayTasks,
  clearActivityLog,
  clearTicks,
  clearTimerState,
  clearCategories,
  clearVoidLog,
  resetAllData,
} from '../lib/storage'
import Select from './Select'
import CategoryManager from './CategoryManager'

const CHIME_LABELS = {
  classic: 'Classic',
  soft: 'Soft',
  alert: 'Alert',
}

const rowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-cream/10 last:border-b-0'

const dangerRowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-tomato/15 last:border-b-0'

// Category-scoped resets — Settings itself is deliberately excluded from all
// of these (see storage.js); only "Reset to Factory Settings" below touches it.
const RESET_CATEGORIES = [
  {
    label: 'Records / Activity Log',
    confirmText: 'This will permanently delete all your Records. This cannot be undone. Continue?',
    action: clearActivityLog,
  },
  {
    label: 'Interruption data (ticks)',
    confirmText:
      'This will permanently delete all your interruption and Pomodoro tick history (used by Reports). This cannot be undone. Continue?',
    action: clearTicks,
  },
  {
    label: "Today's Tasks",
    confirmText:
      "This will permanently delete Today's Tasks and today's Timetable. This cannot be undone. Continue?",
    action: clearTodayTasks,
  },
  {
    label: 'Activity Inventory',
    confirmText: 'This will permanently delete your Activity Inventory. This cannot be undone. Continue?',
    action: clearInventory,
  },
  {
    label: 'Timer state',
    confirmText:
      'This will reset the saved timer state (useful if a Pomodoro looks stuck after a refresh). This cannot be undone. Continue?',
    action: clearTimerState,
  },
  {
    label: 'Categories',
    confirmText:
      'This will permanently delete all your Categories. Tasks and records using them will show as uncategorized. This cannot be undone. Continue?',
    action: clearCategories,
  },
  {
    label: 'Void log',
    confirmText:
      'This will permanently delete your Void log (voided Pomodoros and their reasons). This cannot be undone. Continue?',
    action: clearVoidLog,
  },
]

function handleCategoryDelete(category) {
  if (window.confirm(category.confirmText)) {
    category.action()
    window.location.reload()
  }
}

function handleFactoryReset() {
  if (
    window.confirm(
      "This will permanently delete EVERYTHING — Activity Inventory, Today's Tasks, Records, interruption history, Categories, the Void log, AND your settings (cycle length, sound, theme). The app will return to its first-launch state. This cannot be undone. Continue?"
    )
  ) {
    resetAllData()
    window.location.reload()
  }
}

function SettingsTab({
  cycleLength,
  setCycleLength,
  resetCycleLength,
  chimeStyle,
  setChimeStyle,
  theme,
  onToggleTheme,
  categories,
  addCategory,
  updateCategory,
  removeCategory,
}) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-2">
          Settings
        </p>

        <div className={rowClass}>
          <label htmlFor="cycle-length">Long break every</label>
          <div className="flex items-center gap-2">
            <input
              id="cycle-length"
              type="number"
              min="1"
              max="12"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="w-12 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream px-1 py-1"
            />
            <span>pomodoro</span>
            {cycleLength !== DEFAULT_CYCLE_LENGTH && (
              <button
                type="button"
                onClick={resetCycleLength}
                className="underline decoration-dotted text-cream"
                title={`Reset to default (${DEFAULT_CYCLE_LENGTH})`}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className={rowClass}>
          <label htmlFor="chime-style">Sound</label>
          <div className="flex items-center gap-2">
            <Select
              id="chime-style"
              value={chimeStyle}
              options={CHIME_STYLES}
              labels={CHIME_LABELS}
              onChange={setChimeStyle}
            />
            <button
              type="button"
              onClick={() => {
                unlockAudio()
                playChime(chimeStyle)
              }}
              className="underline decoration-dotted text-cream"
            >
              Test
            </button>
          </div>
        </div>

        <div className={rowClass}>
          <span>Theme</span>
          <button
            type="button"
            onClick={onToggleTheme}
            title="Toggle light/dark theme"
            className="text-cream border border-cream/15 rounded-full px-3 py-1"
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>

        {/* Not wired up yet — surfacing the category here so the Settings tab
            reflects the full intended settings set, without adding new timer
            duration/i18n logic as part of this layout pass. */}
        <div className={`${rowClass} text-sage/50`}>
          <span>Short/long break duration</span>
          <span className="italic">Coming soon</span>
        </div>

        <div className={`${rowClass} text-sage/50`}>
          <span>Language</span>
          <span className="italic">Coming soon</span>
        </div>
      </div>

      <CategoryManager
        categories={categories}
        addCategory={addCategory}
        updateCategory={updateCategory}
        removeCategory={removeCategory}
      />

      <div className="bg-black/20 border border-tomato/30 rounded-3xl px-6 py-6 shadow-lg w-full mt-6">
        <p className="font-display text-tomato font-bold text-xs tracking-widest uppercase mb-1">
          Danger Zone
        </p>
        <p className="text-sage text-[11px] font-sans mb-2">
          These actions permanently delete data and cannot be undone.
        </p>

        {RESET_CATEGORIES.map((category) => (
          <div key={category.label} className={dangerRowClass}>
            <span>{category.label}</span>
            <button
              type="button"
              onClick={() => handleCategoryDelete(category)}
              className="text-tomato border border-tomato/40 rounded-full px-3 py-1"
            >
              Delete
            </button>
          </div>
        ))}

        <div className="pt-4 mt-1">
          <button
            type="button"
            onClick={handleFactoryReset}
            className="w-full font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream font-semibold"
          >
            Reset to Factory Settings
          </button>
          <p className="text-sage/60 text-[10px] font-sans mt-2 text-center">
            Deletes everything, including these settings, and returns the app to its default state.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab
