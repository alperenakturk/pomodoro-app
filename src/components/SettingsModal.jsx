import { useState, useEffect, useRef } from 'react'
import { unlockAudio, playChime, CHIME_STYLES, AMBIENT_SOUNDS, startAmbientSound, stopAmbientSound } from '../lib/alert'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_WORK_MINUTES,
  WORK_MIN,
  WORK_MAX,
  SHORT_BREAK_MIN,
  SHORT_BREAK_MAX,
  SHORT_BREAK_RECOMMENDED_MAX,
  LONG_BREAK_MIN,
  LONG_BREAK_MAX,
  LONG_BREAK_RECOMMENDED_MAX,
} from '../hooks/usePomodoro'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
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
import { THEMES } from '../lib/theme'
import ChangePasswordModal from './ChangePasswordModal'
import AuthModal from './AuthModal'
import {
  validateBackgroundFile,
  uploadFullscreenBackground,
  removeFullscreenBackground,
  MAX_BACKGROUND_BYTES,
  ALLOWED_BACKGROUND_TYPES,
} from '../lib/backgroundStorage'

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

// Both await their storage.js action before reloading — for a signed-in
// user that action is a real network delete (remoteProvider's remove()),
// and reloading immediately after firing it unawaited was racing (and
// usually winning against) the request actually reaching Supabase, so the
// button appeared to do nothing. See remoteProvider.js's remove() for the
// full write-up.
async function handleCategoryDelete(category, t) {
  if (window.confirm(t(category.confirmKey))) {
    await category.action()
    window.location.reload()
  }
}

async function handleFactoryReset(t) {
  if (window.confirm(t('settings.factoryResetConfirm'))) {
    await resetAllData()
    window.location.reload()
  }
}

// Signed-in only (see the `user &&` guard where this is rendered). Strong
// confirmation matching Factory Reset's severity — this doesn't just clear
// local data, it permanently deletes the Supabase account and every row
// belonging to it (see supabase/schema.sql's delete_user() function).
// deleteAccount() itself also signs out on success, so the reload below
// lands back in guest mode, same as any other Danger Zone action.
async function handleDeleteAccount(t, deleteAccount) {
  if (!window.confirm(t('settings.deleteAccountConfirm'))) return
  const { error } = await deleteAccount()
  if (error) {
    window.alert(t('settings.deleteAccountError'))
    return
  }
  window.location.reload()
}

// A Google-only account has no password to change — Supabase's `identities`
// array lists every provider actually linked to this user (an account can
// have both if the user later links email/password too), so this checks for
// a real 'email' identity rather than assuming based on how they first
// signed up.
function hasPasswordProvider(user) {
  return Boolean(user?.identities?.some((identity) => identity.provider === 'email'))
}

function GeneralIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 6h10M17 6h3M4 12h3M9 12h11M4 18h13M20 18h0" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  )
}

function TimerIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9.5 2h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SoundIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10v4h3.5L12 17.5v-11L7.5 10H4Z" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" strokeLinecap="round" />
    </svg>
  )
}

function AccountIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" strokeLinecap="round" />
    </svg>
  )
}

function DataIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" strokeLinecap="round" />
    </svg>
  )
}

// Placeholder category (see CATEGORIES below) — no real achievement system
// yet, just a "coming in the full version" message. A simple star/badge
// glyph, same stroke-only style as the other sidebar icons.
function AchievementsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M12 4.5 14 9l5 .6-3.7 3.4.9 5-4.2-2.4-4.2 2.4.9-5L5 9.6 10 9Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AboutIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

const CATEGORIES = [
  { id: 'general', labelKey: 'settings.categoryGeneral', Icon: GeneralIcon },
  { id: 'timer', labelKey: 'settings.categoryTimer', Icon: TimerIcon },
  { id: 'sound', labelKey: 'settings.categorySound', Icon: SoundIcon },
  { id: 'account', labelKey: 'settings.categoryAccount', Icon: AccountIcon },
  { id: 'data', labelKey: 'settings.categoryData', Icon: DataIcon },
  { id: 'achievements', labelKey: 'settings.categoryAchievements', Icon: AchievementsIcon },
  { id: 'about', labelKey: 'settings.categoryAbout', Icon: AboutIcon },
]

// Settings used to be its own always-mounted tab panel (reachable only via
// the header gear icon, per the old Tab layout). It's now a real modal —
// same shell pattern as DayReview/KeyboardShortcutsModal (fixed backdrop,
// centered dialog, focus moved in on open/restored on close) — with a
// sidebar splitting what used to be one long scroll into six categories
// (design-mockups/05). The category buckets are a presentation grouping
// only: every field still reads/writes the exact same props/hooks as before.
function SettingsModal({
  onClose,
  initialCategory = 'general',
  cycleLength,
  setCycleLength,
  resetCycleLength,
  workMinutes,
  setWorkMinutes,
  shortBreakMinutes,
  setShortBreakMinutes,
  longBreakMinutes,
  setLongBreakMinutes,
  autoStartBreaks,
  setAutoStartBreaks,
  autoStartPomodoros,
  setAutoStartPomodoros,
  chimeStyle,
  setChimeStyle,
  soundVolume,
  setSoundVolume,
  ambientVolume,
  setAmbientVolume,
  ambientSound,
  setAmbientSound,
  checkToBottom,
  setCheckToBottom,
  displayName,
  setDisplayName,
  theme,
  onSelectTheme,
  customThemeGeneral,
  setCustomThemeGeneral,
  customThemeFocus,
  setCustomThemeFocus,
  customThemeShortBreak,
  setCustomThemeShortBreak,
  customThemeLongBreak,
  setCustomThemeLongBreak,
  fullscreenBackgroundPath,
  setFullscreenBackgroundPath,
  categories,
  addCategory,
  updateCategory,
  removeCategory,
  onReplayWelcome,
}) {
  const { t, language, setLanguage } = useTranslation()
  const { user, deleteAccount } = useAuth()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  // Defaults to 'general' via the gear icon, but the "+ Add category"
  // shortcut inside CategoryTagPicker (Inventory/Today's Tasks/Records Log)
  // opens straight to 'data' instead — see App.jsx's openCategoryManager.
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [backgroundBusy, setBackgroundBusy] = useState(false)
  const [backgroundError, setBackgroundError] = useState(null)
  const backgroundFileInputRef = useRef(null)
  const [ambientTesting, setAmbientTesting] = useState(false)
  const ambientTestTimeoutRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Fullscreen background upload/remove — talks directly to
  // backgroundStorage.js's Supabase Storage calls (same pattern as this
  // modal's existing direct storage.js calls for Danger Zone), then
  // persists the resulting path via the setter prop from App.jsx.
  async function handleBackgroundFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allows re-selecting the same file later
    if (!file || !user) return
    const { valid, reason } = validateBackgroundFile(file)
    if (!valid) {
      setBackgroundError(reason === 'size' ? 'size' : 'type')
      return
    }
    setBackgroundError(null)
    setBackgroundBusy(true)
    const { path, error } = await uploadFullscreenBackground(file, user.id)
    setBackgroundBusy(false)
    if (error) {
      setBackgroundError('upload')
      return
    }
    setFullscreenBackgroundPath(path)
  }

  async function handleRemoveBackground() {
    if (!user) return
    setBackgroundError(null)
    setBackgroundBusy(true)
    const { error } = await removeFullscreenBackground(user.id)
    setBackgroundBusy(false)
    if (error) {
      setBackgroundError('upload')
      return
    }
    setFullscreenBackgroundPath(null)
  }

  // Ambient sound "Test" button — plays the currently-selected ambient
  // sound for a few seconds so the user can preview it before committing,
  // then stops automatically. Guards against overlapping clicks with
  // `ambientTesting`/the timeout ref rather than letting a second click
  // restart the preview clock.
  const AMBIENT_TEST_DURATION_MS = 3000
  function handleTestAmbientSound() {
    if (ambientTesting || ambientSound === 'none') return
    unlockAudio()
    startAmbientSound(ambientSound)
    setAmbientTesting(true)
    ambientTestTimeoutRef.current = setTimeout(() => {
      stopAmbientSound()
      setAmbientTesting(false)
      ambientTestTimeoutRef.current = null
    }, AMBIENT_TEST_DURATION_MS)
  }

  // Stops a still-running preview if the modal closes mid-test — otherwise
  // the ambient bed would keep playing after Settings is dismissed.
  useEffect(() => {
    return () => {
      if (ambientTestTimeoutRef.current) {
        clearTimeout(ambientTestTimeoutRef.current)
        stopAmbientSound()
      }
    }
  }, [])

  const chimeLabels = {
    classic: t('chime.classic'),
    soft: t('chime.soft'),
    alert: t('chime.alert'),
  }
  const ambientSoundLabels = {
    none: t('settings.ambientNone'),
    ticking: t('settings.ambientTicking'),
    rain: t('settings.ambientRain'),
    cafe: t('settings.ambientCafe'),
    whiteNoise: t('settings.ambientWhiteNoise'),
  }
  const languageLabels = {
    en: t('settings.languageEnglish'),
    tr: t('settings.languageTurkish'),
  }
  // Reused by the Custom theme's four sub-pickers below — each one chooses
  // among the same five real palettes the main picker offers.
  const themeIds = THEMES.map((option) => option.id)
  const themeLabels = Object.fromEntries(THEMES.map((option) => [option.id, t(option.labelKey)]))

  const activeLabelKey = CATEGORIES.find((c) => c.id === activeCategory)?.labelKey

  // ChangePasswordModal is rendered as a sibling of the backdrop below, not
  // nested inside it — both are `fixed inset-0` overlays with their own
  // backdrop-click-to-close handler, and nesting one inside the other would
  // let a click on ChangePasswordModal's backdrop bubble up through this
  // modal's backdrop too, closing both at once.
  return (
    <>
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 sm:p-6 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-heading"
        className="bg-pine border border-cream/15 rounded-3xl shadow-2xl w-full max-w-3xl h-[min(85vh,42rem)] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="w-40 sm:w-56 flex-shrink-0 border-r border-cream/10 p-3 sm:p-4 flex flex-col gap-1 overflow-y-auto">
          <p
            id="settings-heading"
            className="font-display text-cream font-bold text-xs tracking-widest uppercase px-2 mb-2"
          >
            {t('settings.title')}
          </p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              aria-current={activeCategory === cat.id ? 'page' : undefined}
              className={
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-sans text-left transition-colors border ' +
                (activeCategory === cat.id
                  ? 'bg-tomato/10 border-tomato/30 text-cream'
                  : 'border-transparent text-sage hover:text-cream')
              }
            >
              <cat.Icon className="w-4 h-4 flex-shrink-0" />
              <span>{t(cat.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 relative">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-sage hover:text-cream text-xl leading-none"
            aria-label={t('settings.closeAria')}
          >
            ×
          </button>

          {/* Normal-case, larger, sans — same reasoning as Reports.jsx's
              content-pane heading: the sidebar button just left of this
              already names the category in small uppercase mono, so
              repeating it in the identical heavy-caps style here read as
              redundant. This is the actual content's heading, not another
              nav label. */}
          <h2 className="font-sans text-cream font-semibold text-base mb-4 pr-8">
            {t(activeLabelKey)}
          </h2>

          {activeCategory === 'general' && (
            <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-1">
              <div className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="display-name">{t('settings.displayNameLabel')}</label>
                  <span className="text-sage/40 text-[10px]">{t('settings.displayNameHint')}</span>
                </div>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('settings.displayNamePlaceholder')}
                  maxLength={40}
                  className="w-32 bg-cream/5 border border-cream/15 rounded-lg text-cream placeholder:text-sage/40 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
                />
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

              <div className="flex flex-col gap-2 text-sage text-xs font-sans py-3 border-b border-cream/10">
                <span>{t('settings.themeLabel')}</span>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((option) => {
                    const active =
                      theme === option.id || (theme === 'light' && option.id === 'light-terracotta')
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onSelectTheme(option.id)}
                        aria-pressed={active}
                        className={
                          'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ' +
                          (active ? 'border-tomato text-cream' : 'border-cream/15 text-sage hover:text-cream')
                        }
                      >
                        <span
                          className={`${option.id} flex items-center gap-1 rounded p-1 border border-cream/10`}
                          style={{ backgroundColor: 'var(--color-pine)' }}
                        >
                          <span
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: 'var(--color-pine-dark)' }}
                          />
                          <span
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: 'var(--color-cream)' }}
                          />
                        </span>
                        {t(option.labelKey)}
                      </button>
                    )
                  })}

                  {/* Not one of the five real palettes — a meta-option that
                      picks a *different* real palette for General vs. each
                      Timer session type (sub-pickers just below). No swatch
                      preview makes sense for it (there's no single color to
                      show), so it's a plain labeled button. */}
                  <button
                    type="button"
                    onClick={() => onSelectTheme('custom')}
                    aria-pressed={theme === 'custom'}
                    className={
                      'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ' +
                      (theme === 'custom' ? 'border-tomato text-cream' : 'border-cream/15 text-sage hover:text-cream')
                    }
                  >
                    {t('settings.themeCustom')}
                  </button>
                </div>

                {theme === 'custom' && (
                  <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-cream/10">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="custom-theme-general">{t('settings.customThemeGeneralLabel')}</label>
                      <Select
                        id="custom-theme-general"
                        value={customThemeGeneral}
                        options={themeIds}
                        labels={themeLabels}
                        onChange={setCustomThemeGeneral}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="custom-theme-focus">{t('settings.customThemeFocusLabel')}</label>
                      <Select
                        id="custom-theme-focus"
                        value={customThemeFocus}
                        options={themeIds}
                        labels={themeLabels}
                        onChange={setCustomThemeFocus}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="custom-theme-short-break">{t('settings.customThemeShortBreakLabel')}</label>
                      <Select
                        id="custom-theme-short-break"
                        value={customThemeShortBreak}
                        options={themeIds}
                        labels={themeLabels}
                        onChange={setCustomThemeShortBreak}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="custom-theme-long-break">{t('settings.customThemeLongBreakLabel')}</label>
                      <Select
                        id="custom-theme-long-break"
                        value={customThemeLongBreak}
                        options={themeIds}
                        labels={themeLabels}
                        onChange={setCustomThemeLongBreak}
                      />
                    </div>
                    <p className="text-sage/40 text-[10px] mt-1">{t('settings.customThemeHint')}</p>
                  </div>
                )}
              </div>

              {/* Always shown, even for guests — Fullscreen Focus Mode
                  backgrounds are stored in Supabase Storage (see
                  backgroundStorage.js), which guests have no account to
                  store anything in, so the controls are visually disabled
                  (dimmed, not a native `disabled` attribute — they still
                  need to be clickable) and open AuthModal instead of the
                  file picker/remove action until signed in. */}
              <div className="flex flex-col gap-2 text-sage text-xs font-sans py-3 border-b border-cream/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span>{t('settings.backgroundLabel')}</span>
                    <span className="text-sage/40 text-[10px]">{t('settings.backgroundHint')}</span>
                    {!user && (
                      <button
                        type="button"
                        onClick={() => setAuthModalOpen(true)}
                        className="text-tomato text-[10px] text-left underline decoration-dotted mt-0.5"
                      >
                        {t('settings.backgroundSignInHint')}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      ref={backgroundFileInputRef}
                      type="file"
                      accept={ALLOWED_BACKGROUND_TYPES.join(',')}
                      onChange={handleBackgroundFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => (user ? backgroundFileInputRef.current?.click() : setAuthModalOpen(true))}
                      disabled={backgroundBusy}
                      className={
                        'border rounded-full px-3 py-1 disabled:opacity-50 ' +
                        (user ? 'text-cream border-cream/15' : 'text-sage/50 border-cream/10')
                      }
                    >
                      {backgroundBusy ? t('settings.backgroundUploading') : t('settings.backgroundUploadButton')}
                    </button>
                    {user && fullscreenBackgroundPath && (
                      <button
                        type="button"
                        onClick={handleRemoveBackground}
                        disabled={backgroundBusy}
                        className="text-tomato border border-tomato/40 rounded-full px-3 py-1 disabled:opacity-50"
                      >
                        {t('settings.backgroundRemoveButton')}
                      </button>
                    )}
                  </div>
                </div>

                {user && backgroundError && (
                  <p className="text-tomato text-[10px]">
                    {t(
                      backgroundError === 'size'
                        ? 'settings.backgroundErrorSize'
                        : backgroundError === 'type'
                          ? 'settings.backgroundErrorType'
                          : 'settings.backgroundErrorUpload',
                      { max: MAX_BACKGROUND_BYTES / (1024 * 1024) }
                    )}
                  </p>
                )}

                {/* Not built yet — see chat/CLAUDE.md: a curated preset
                    gallery (no upload needed) is planned for a future
                    iteration, this upload flow is the first one. */}
                <p className="text-sage/40 text-[10px] italic">{t('settings.backgroundPresetGalleryHint')}</p>
              </div>

              <div className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="check-to-bottom">{t('settings.checkToBottomLabel')}</label>
                  <span className="text-sage/40 text-[10px]">{t('settings.checkToBottomHint')}</span>
                </div>
                <input
                  id="check-to-bottom"
                  type="checkbox"
                  checked={checkToBottom}
                  onChange={(e) => setCheckToBottom(e.target.checked)}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          )}

          {activeCategory === 'timer' && (
            <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-1">
              <div className="border-b border-cream/10 py-3">
                <div className="flex items-center justify-between gap-3 text-sage text-xs font-sans">
                  <div className="flex flex-col gap-0.5">
                    <label htmlFor="work-minutes">{t('settings.workDurationLabel')}</label>
                    <span className="text-sage/40 text-[10px]">
                      {t('settings.minutesRangeHint', { min: WORK_MIN, max: WORK_MAX })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="work-minutes"
                      type="number"
                      min={WORK_MIN}
                      max={WORK_MAX}
                      value={workMinutes}
                      onChange={(e) => setWorkMinutes(Number(e.target.value))}
                      className="w-12 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream px-1 py-1"
                    />
                    <span>{t('settings.minutesUnit')}</span>
                  </div>
                </div>
                {workMinutes !== DEFAULT_WORK_MINUTES && (
                  <p className="text-sage/60 text-[10px] font-sans mt-1">
                    {t('settings.workDurationDeviationNote')}
                  </p>
                )}
              </div>

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

              <div className="border-b border-cream/10 py-3">
                <div className="flex items-center justify-between gap-3 text-sage text-xs font-sans">
                  <div className="flex flex-col gap-0.5">
                    <label htmlFor="short-break-minutes">{t('settings.shortBreakLabel')}</label>
                    <span className="text-sage/40 text-[10px]">
                      {t('settings.minutesRangeHint', { min: SHORT_BREAK_MIN, max: SHORT_BREAK_MAX })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="short-break-minutes"
                      type="number"
                      min={SHORT_BREAK_MIN}
                      max={SHORT_BREAK_MAX}
                      value={shortBreakMinutes}
                      onChange={(e) => setShortBreakMinutes(Number(e.target.value))}
                      className="w-12 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream px-1 py-1"
                    />
                    <span>{t('settings.minutesUnit')}</span>
                  </div>
                </div>
                {shortBreakMinutes > SHORT_BREAK_RECOMMENDED_MAX && (
                  <p className="text-sage/60 text-[10px] font-sans mt-1">
                    {t('settings.shortBreakRecommendedHint')}
                  </p>
                )}
              </div>

              <div className="border-b border-cream/10 py-3">
                <div className="flex items-center justify-between gap-3 text-sage text-xs font-sans">
                  <div className="flex flex-col gap-0.5">
                    <label htmlFor="long-break-minutes">{t('settings.longBreakLabel')}</label>
                    <span className="text-sage/40 text-[10px]">
                      {t('settings.minutesRangeHint', { min: LONG_BREAK_MIN, max: LONG_BREAK_MAX })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="long-break-minutes"
                      type="number"
                      min={LONG_BREAK_MIN}
                      max={LONG_BREAK_MAX}
                      value={longBreakMinutes}
                      onChange={(e) => setLongBreakMinutes(Number(e.target.value))}
                      className="w-12 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream px-1 py-1"
                    />
                    <span>{t('settings.minutesUnit')}</span>
                  </div>
                </div>
                {longBreakMinutes > LONG_BREAK_RECOMMENDED_MAX && (
                  <p className="text-sage/60 text-[10px] font-sans mt-1">
                    {t('settings.longBreakRecommendedHint')}
                  </p>
                )}
              </div>

              <div className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="auto-start-breaks">{t('settings.autoStartBreaksLabel')}</label>
                  <span className="text-sage/40 text-[10px]">{t('settings.autoStartBreaksHint')}</span>
                </div>
                <input
                  id="auto-start-breaks"
                  type="checkbox"
                  checked={autoStartBreaks}
                  onChange={(e) => setAutoStartBreaks(e.target.checked)}
                  className="flex-shrink-0"
                />
              </div>

              <div className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="auto-start-pomodoros">{t('settings.autoStartPomodorosLabel')}</label>
                  <span className="text-sage/40 text-[10px]">{t('settings.autoStartPomodorosHint')}</span>
                </div>
                <input
                  id="auto-start-pomodoros"
                  type="checkbox"
                  checked={autoStartPomodoros}
                  onChange={(e) => setAutoStartPomodoros(e.target.checked)}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          )}

          {activeCategory === 'sound' && (
            <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-1">
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
                <label htmlFor="sound-volume">{t('settings.effectsVolumeLabel')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="sound-volume"
                    type="range"
                    min="0"
                    max="100"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(Number(e.target.value))}
                    className="w-28 accent-tomato"
                  />
                  <span className="w-8 text-right tabular-nums">{soundVolume}%</span>
                </div>
              </div>

              <div className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="ambient-sound">{t('settings.ambientSoundLabel')}</label>
                  <span className="text-sage/40 text-[10px]">{t('settings.ambientSoundHint')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    id="ambient-sound"
                    value={ambientSound}
                    options={AMBIENT_SOUNDS}
                    labels={ambientSoundLabels}
                    onChange={setAmbientSound}
                  />
                  <button
                    type="button"
                    onClick={handleTestAmbientSound}
                    disabled={ambientSound === 'none' || ambientTesting}
                    className="underline decoration-dotted text-cream disabled:opacity-40 disabled:no-underline"
                  >
                    {ambientTesting ? t('settings.testingButton') : t('settings.testButton')}
                  </button>
                </div>
              </div>

              <div className={rowClass}>
                <label htmlFor="ambient-volume">{t('settings.ambientVolumeLabel')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="ambient-volume"
                    type="range"
                    min="0"
                    max="100"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(Number(e.target.value))}
                    className="w-28 accent-tomato"
                  />
                  <span className="w-8 text-right tabular-nums">{ambientVolume}%</span>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'account' && (
            <div className="flex flex-col gap-4">
              <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-1">
                <p className="text-cream text-xs font-sans py-3 border-b border-cream/10">
                  {user ? t('settings.signedInAs', { email: user.email }) : t('settings.notSignedIn')}
                </p>
                {!user && (
                  <div className={rowClass}>
                    <span>{t('settings.signInPromptLabel')}</span>
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="text-tomato border border-tomato/40 rounded-full px-3 py-1"
                    >
                      {t('auth.signInButton')}
                    </button>
                  </div>
                )}

                {user && hasPasswordProvider(user) && (
                  <div className={rowClass}>
                    <span>{t('settings.changePasswordLabel')}</span>
                    <button
                      type="button"
                      onClick={() => setChangePasswordOpen(true)}
                      className="text-cream border border-cream/15 rounded-full px-3 py-1"
                    >
                      {t('settings.changePasswordButton')}
                    </button>
                  </div>
                )}
              </div>

              {user && (
                <div className="bg-pine-dark border border-tomato/30 rounded-2xl px-4 py-4">
                  <p className="font-display text-tomato font-bold text-xs tracking-widest uppercase mb-2">
                    {t('settings.dangerZoneTitle')}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(t, deleteAccount)}
                    className="w-full font-sans text-sm px-4 py-2 rounded-xl border border-tomato text-tomato font-semibold"
                  >
                    {t('settings.deleteAccountButton')}
                  </button>
                  <p className="text-sage/60 text-[10px] font-sans mt-2 text-center">
                    {t('settings.deleteAccountHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeCategory === 'data' && (
            <div className="flex flex-col gap-6">
              <CategoryManager
                categories={categories}
                addCategory={addCategory}
                updateCategory={updateCategory}
                removeCategory={removeCategory}
              />

              <DataTransfer categories={categories} />

              <div className="bg-pine-dark border border-tomato/30 rounded-2xl px-4 py-4">
                <p className="font-display text-tomato font-bold text-xs tracking-widest uppercase mb-1">
                  {t('settings.dangerZoneTitle')}
                </p>
                <p className="text-sage text-[11px] font-sans mb-2">{t('settings.dangerZoneWarning')}</p>

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
          )}

          {activeCategory === 'achievements' && (
            <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-10 text-center">
              <p className="text-sage text-sm font-sans">{t('settings.achievementsComingSoon')}</p>
            </div>
          )}

          {activeCategory === 'about' && (
            <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4 text-sage text-xs font-sans leading-relaxed flex flex-col gap-3">
              <p className="text-cream font-semibold">{t('common.appTitle')}</p>
              <p>{t('settings.aboutDescription')}</p>

              <div className="pt-3 border-t border-cream/10 flex flex-col gap-1.5">
                <p>
                  <span className="text-sage/60">{t('settings.aboutContactLabel')}: </span>
                  <a href="mailto:ahmetalperenakturk@gmail.com" className="text-tomato hover:underline">
                    ahmetalperenakturk@gmail.com
                  </a>
                </p>
                <p>
                  <span className="text-sage/60">{t('settings.aboutSourceLabel')}: </span>
                  <a
                    href="https://github.com/alperenakturk/pomodoro-app"
                    target="_blank"
                    rel="noreferrer"
                    className="text-tomato hover:underline"
                  >
                    github.com/alperenakturk/pomodoro-app
                  </a>
                </p>
              </div>

              <p className="text-sage/60 text-[11px] pt-3 border-t border-cream/10">
                {t('settings.aboutAttribution')}
              </p>

              {onReplayWelcome && (
                <div className="pt-3 border-t border-cream/10">
                  <button
                    type="button"
                    onClick={onReplayWelcome}
                    className="font-sans text-xs px-3 py-1.5 rounded-lg border border-cream/20 text-cream hover:border-cream/40"
                  >
                    {t('settings.replayWelcome')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {changePasswordOpen && <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />}
    {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  )
}

export default SettingsModal
