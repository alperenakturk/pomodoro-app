import { unlockAudio, playChime, CHIME_STYLES } from '../lib/alert'
import { DEFAULT_CYCLE_LENGTH } from '../hooks/usePomodoro'
import { useTranslation } from '../hooks/useTranslation'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
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
import DataTransfer from './DataTransfer'

const rowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-cream/10 last:border-b-0'

const dangerRowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-tomato/15 last:border-b-0'

// Category-scoped resets — Settings itself is deliberately excluded from all
// of these (see storage.js); only "Reset to Factory Settings" below touches it.
const RESET_CATEGORIES = [
  { labelKey: 'settings.resetRecordsLabel', confirmKey: 'settings.resetRecordsConfirm', action: clearActivityLog },
  { labelKey: 'settings.resetTicksLabel', confirmKey: 'settings.resetTicksConfirm', action: clearTicks },
  { labelKey: 'settings.resetTodayLabel', confirmKey: 'settings.resetTodayConfirm', action: clearTodayTasks },
  { labelKey: 'settings.resetInventoryLabel', confirmKey: 'settings.resetInventoryConfirm', action: clearInventory },
  { labelKey: 'settings.resetTimerLabel', confirmKey: 'settings.resetTimerConfirm', action: clearTimerState },
  { labelKey: 'settings.resetCategoriesLabel', confirmKey: 'settings.resetCategoriesConfirm', action: clearCategories },
  { labelKey: 'settings.resetVoidLogLabel', confirmKey: 'settings.resetVoidLogConfirm', action: clearVoidLog },
]

function handleCategoryDelete(category, t) {
  if (window.confirm(t(category.confirmKey))) {
    category.action()
    window.location.reload()
  }
}

function handleFactoryReset(t) {
  if (window.confirm(t('settings.factoryResetConfirm'))) {
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
  const { t, language, setLanguage } = useTranslation()
  const chimeLabels = {
    classic: t('chime.classic'),
    soft: t('chime.soft'),
    alert: t('chime.alert'),
  }
  const languageLabels = {
    en: t('settings.languageEnglish'),
    tr: t('settings.languageTurkish'),
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-2">
          {t('settings.title')}
        </p>

        <div className={rowClass}>
          <label htmlFor="cycle-length">{t('settings.longBreakEvery')}</label>
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
            <span>{t('settings.pomodoroUnit')}</span>
            {cycleLength !== DEFAULT_CYCLE_LENGTH && (
              <button
                type="button"
                onClick={resetCycleLength}
                className="underline decoration-dotted text-cream"
                title={t('settings.resetTitle', { value: DEFAULT_CYCLE_LENGTH })}
              >
                {t('settings.resetButton')}
              </button>
            )}
          </div>
        </div>

        <div className={rowClass}>
          <label htmlFor="chime-style">{t('settings.soundLabel')}</label>
          <div className="flex items-center gap-2">
            <Select
              id="chime-style"
              value={chimeStyle}
              options={CHIME_STYLES}
              labels={chimeLabels}
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
              {t('settings.testButton')}
            </button>
          </div>
        </div>

        <div className={rowClass}>
          <span>{t('settings.themeLabel')}</span>
          <button
            type="button"
            onClick={onToggleTheme}
            title={t('settings.toggleThemeTitle')}
            className="text-cream border border-cream/15 rounded-full px-3 py-1"
          >
            {theme === 'light' ? t('settings.darkMode') : t('settings.lightMode')}
          </button>
        </div>

        {/* Not wired up yet — surfacing the category here so the Settings tab
            reflects the full intended settings set; break duration remains a
            placeholder, unlike Language above it (now functional). */}
        <div className={`${rowClass} text-sage/50`}>
          <span>{t('settings.breakDurationLabel')}</span>
          <span className="italic">{t('settings.comingSoon')}</span>
        </div>

        <div className={rowClass}>
          <label htmlFor="language-select">{t('settings.languageLabel')}</label>
          <Select
            id="language-select"
            value={language}
            options={SUPPORTED_LANGUAGES}
            labels={languageLabels}
            onChange={setLanguage}
          />
        </div>
      </div>

      <CategoryManager
        categories={categories}
        addCategory={addCategory}
        updateCategory={updateCategory}
        removeCategory={removeCategory}
      />

      <DataTransfer categories={categories} />

      <div className="bg-black/20 border border-tomato/30 rounded-3xl px-6 py-6 shadow-lg w-full mt-6">
        <p className="font-display text-tomato font-bold text-xs tracking-widest uppercase mb-1">
          {t('settings.dangerZoneTitle')}
        </p>
        <p className="text-sage text-[11px] font-sans mb-2">
          {t('settings.dangerZoneWarning')}
        </p>

        {RESET_CATEGORIES.map((category) => (
          <div key={category.labelKey} className={dangerRowClass}>
            <span>{t(category.labelKey)}</span>
            <button
              type="button"
              onClick={() => handleCategoryDelete(category, t)}
              className="text-tomato border border-tomato/40 rounded-full px-3 py-1"
            >
              {t('settings.deleteButton')}
            </button>
          </div>
        ))}

        <div className="pt-4 mt-1">
          <button
            type="button"
            onClick={() => handleFactoryReset(t)}
            className="w-full font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream font-semibold"
          >
            {t('settings.resetFactoryButton')}
          </button>
          <p className="text-sage/60 text-[10px] font-sans mt-2 text-center">
            {t('settings.resetFactoryHint')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab
