import { mergeCollectionById, csvRowsToActivityRecords, mergeActivityRecordsByNaturalKey } from './importData'
import * as remoteProvider from './remoteProvider'
import { CATEGORY_COLORS, DEFAULT_CATEGORY_SEEDS } from './constants'
import { resolveLanguage, translate } from './i18n'

// Storage provider: every load/save/clear below goes through this object
// rather than touching localStorage directly. This is what the "swapping in
// a remote backend means replacing this one object" promise (see git
// history) actually resolves to now: `activeProvider` is mutable and
// switches to remoteProvider.js while signed in (see signInToRemote/
// signOutFromRemote at the bottom of this file) — every load*/save* function
// below is unchanged either way, since both providers implement the same
// get(collection, fallback)/set(collection, value)/remove(collection) shape.
const localStorageProvider = {
  get(collection, fallback) {
    try {
      const raw = localStorage.getItem(collection)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  set(collection, value) {
    localStorage.setItem(collection, JSON.stringify(value))
  },
  remove(collection) {
    localStorage.removeItem(collection)
  },
}

let activeProvider = localStorageProvider

function loadJSON(key, fallback) {
  return activeProvider.get(key, fallback)
}

function saveJSON(key, value) {
  activeProvider.set(key, value)
}

// Reports ve Records gibi bağımsız bileşenlerin, veri her değiştiğinde
// (polling beklemeden) anında haberdar olması için basit bir olay sistemi.
const EVENT_NAME = 'pomodoro-data-changed'

function notifyChange() {
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function subscribeToChanges(callback) {
  window.addEventListener(EVENT_NAME, callback)
  return () => window.removeEventListener(EVENT_NAME, callback)
}

// Schema versioning: none of these keys carry a version number, so old
// records from before a field existed (e.g. reestimate1/reestimate2,
// pairWith, urgent) simply lack that key in the parsed JSON. Each load
// function below runs its records through a normalize step that fills in
// the same default the "add" helper would have used, so consumers never
// have to guard against `undefined` on a field that "should" always exist.

// Categories moved from a single categoryId to a categoryIds array (tags,
// not a single pick). Old data only ever had `categoryId` (string or null) —
// wrap it into a one-element array (or [] if null) rather than losing it.
function normalizeCategoryIds(record) {
  if (Array.isArray(record.categoryIds)) return record.categoryIds
  if (record.categoryId != null) return [record.categoryId]
  return []
}

// Backend-readiness prep: every persisted record carries userId/createdAt/
// updatedAt so a future multi-device backend can scope data per-account and
// resolve sync conflicts by recency. Single-user today — userId is always
// 'local' and old records simply have no timestamps (null) — but the shape
// already exists, so wiring in real auth/sync later only changes values,
// not the schema.
function normalizeMeta(record) {
  return {
    userId: record.userId ?? 'local',
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  }
}

// Stamps userId/createdAt/updatedAt onto a freshly created record (used by
// this file's own addX functions, where `record` is already a complete,
// caller-built object — unlike normalize*, which migrates a potentially
// stale/legacy shape, so spreading it here is safe).
function stampCreated(record) {
  const now = new Date().toISOString()
  return {
    ...record,
    userId: record.userId ?? 'local',
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

function stampUpdated(record) {
  return { ...record, updatedAt: new Date().toISOString() }
}

// Activity Inventory: ana görev havuzu
const INVENTORY_KEY = 'pomodoro_inventory'
function normalizeInventoryItem(item) {
  return {
    id: item.id,
    text: item.text,
    estimate: item.estimate ?? null,
    notes: item.notes ?? '',
    categoryIds: normalizeCategoryIds(item),
    deadline: item.deadline ?? null,
    unplanned: item.unplanned ?? false,
    done: item.done ?? false,
    ...normalizeMeta(item),
  }
}
export const loadInventory = () => loadJSON(INVENTORY_KEY, []).map(normalizeInventoryItem)
export const saveInventory = (items) => saveJSON(INVENTORY_KEY, items)

// To Do Today: bugüne seçilen görevler
const TODAY_KEY = 'pomodoro_today_tasks'
function normalizeTodayTask(task) {
  return {
    id: task.id,
    text: task.text,
    estimate: task.estimate ?? null,
    realized: task.realized ?? 0,
    internal: task.internal ?? 0,
    external: task.external ?? 0,
    categoryIds: normalizeCategoryIds(task),
    notes: task.notes ?? '',
    unplanned: task.unplanned ?? false,
    urgent: task.urgent ?? false,
    done: task.done ?? false,
    inventoryId: task.inventoryId ?? null,
    reestimate1: task.reestimate1 ?? null,
    reestimate2: task.reestimate2 ?? null,
    ...normalizeMeta(task),
  }
}
export const loadTodayTasks = () => loadJSON(TODAY_KEY, []).map(normalizeTodayTask)
export const saveTodayTasks = (items) => saveJSON(TODAY_KEY, items)

// Records: tamamlanan görevlerin Tahmin/Gerçek/Fark kaydı
const ACTIVITY_LOG_KEY = 'pomodoro_activity_log'
function normalizeActivityRecord(record) {
  return {
    id: record.id,
    date: record.date,
    time: record.time ?? '',
    activity: record.activity,
    categoryIds: normalizeCategoryIds(record),
    notes: record.notes ?? '',
    estimate: record.estimate ?? null,
    reestimate1: record.reestimate1 ?? null,
    reestimate2: record.reestimate2 ?? null,
    real: record.real ?? 0,
    diff: record.diff ?? null,
    diffI: record.diffI ?? null,
    diffII: record.diffII ?? null,
    internal: record.internal ?? 0,
    external: record.external ?? 0,
    unplanned: record.unplanned ?? false,
    ...normalizeMeta(record),
  }
}
export const loadActivityLog = () => loadJSON(ACTIVITY_LOG_KEY, []).map(normalizeActivityRecord)
export const saveActivityLog = (items) => saveJSON(ACTIVITY_LOG_KEY, items)
export function addActivityRecord(record) {
  const log = loadActivityLog()
  log.push(stampCreated(record))
  saveActivityLog(log)
  notifyChange()
  return log
}
export function removeActivityRecord(id) {
  const log = loadActivityLog().filter((r) => r.id !== id)
  saveActivityLog(log)
  notifyChange()
  return log
}
export function updateActivityRecord(id, patch) {
  const log = loadActivityLog().map((r) => (r.id === id ? stampUpdated({ ...r, ...patch }) : r))
  saveActivityLog(log)
  notifyChange()
  return log
}

// Settings: kullanıcı tarafından ayarlanabilen tercihler (örn. long break'e
// kaç pomodorodan sonra geçileceği)
const SETTINGS_KEY = 'pomodoro_settings'
// `language` is null until the user explicitly picks one in Settings — until
// then the UI auto-detects from navigator.language on every load (see
// resolveLanguage() in lib/i18n) rather than freezing in whatever was
// detected the first time.
const DEFAULT_SETTINGS = {
  cycleLength: 4,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundVolume: 100,
  ambientVolume: 100,
  ambientSound: 'none',
  checkToBottom: false,
  theme: 'light-terracotta',
  chimeStyle: 'classic',
  userId: 'local',
  language: null,
  // A local personalization field, deliberately separate from Supabase auth
  // — it's just what the header's greeting calls you, so it works the same
  // for guests and signed-in users alike. Empty string means "not set,
  // don't show a greeting", same convention as language's null.
  displayName: '',
  // Only read when theme === 'custom' — lets General (everything but the
  // Timer screen) and each of the Timer's three session types independently
  // pick one of the five real palettes (see lib/theme.js's THEMES). Default
  // to the same palette as DEFAULT_SETTINGS.theme itself, so switching to
  // Custom without touching any of the four pickers is a visual no-op
  // rather than an unexpected jump to dark.
  customThemeGeneral: 'light-terracotta',
  customThemeFocus: 'light-terracotta',
  customThemeShortBreak: 'light-terracotta',
  customThemeLongBreak: 'light-terracotta',
  // Signed-in only (see backgroundStorage.js + SettingsModal's `user &&`
  // gate) — a Supabase Storage path (not a URL; the bucket is private, so
  // Timer.jsx resolves a short-lived signed URL from this path only while
  // actually in Fullscreen Focus Mode). null for guests and for signed-in
  // users who haven't uploaded one. Always shown as-is, no dimming overlay.
  fullscreenBackgroundPath: null,
  // Flips to true the first time useCategories.js seeds its starter
  // category set (see DEFAULT_CATEGORY_SEEDS there) — false means "never
  // seeded yet," a one-time-only flag, same pattern as seenCoachMarks below.
  // Without this flag, a user who deletes every category on purpose would
  // see the starter set silently reappear on their next reload.
  defaultCategoriesSeeded: false,
  // Ids of the individual methodology coach marks (see constants.js's
  // COACH_MARKS/pickCoachMark) the user has already dismissed or engaged
  // with — each shows at most once. Settings' "Show onboarding hints again"
  // resets this back to [].
  // Missing the matching Supabase column (see supabase/schema.sql) is
  // harmless: loadSettings() below always merges onto DEFAULT_SETTINGS, so
  // a remote row without this field just resolves to [] for that session,
  // and remoteProvider.js's per-collection try/catch means a rejected
  // upsert (if the column hasn't been added yet) only fails to persist this
  // one field remotely — it never throws or blocks the rest of the app.
  seenCoachMarks: [],
  // How many Pomodoros the user is aiming for per day — captured (optionally)
  // in AccountSetupFlow's last step, also editable afterward in Settings.
  // null means "never set" (not defaulted to a number like 8, which would
  // misrepresent an unset goal as a real choice) — Reports/Today's Summary
  // only show goal-progress UI when this is non-null. Same missing-column
  // degrades-gracefully reasoning as seenCoachMarks above.
  dailyPomodoroGoal: null,
}
// The ticking toggle became a full ambient-sound picker ('none'/'ticking'/
// 'rain'/'cafe'/'whiteNoise') — old boolean tickingSoundEnabled values map
// onto it (true -> 'ticking', false -> 'none') so existing settings don't
// silently reset. Only applies when ambientSound itself was never saved;
// once a real ambientSound value exists it always wins.
function normalizeAmbientSound(raw) {
  if (raw.ambientSound != null) return raw.ambientSound
  if (raw.tickingSoundEnabled != null) return raw.tickingSoundEnabled ? 'ticking' : 'none'
  return DEFAULT_SETTINGS.ambientSound
}
export const loadSettings = () => {
  const raw = loadJSON(SETTINGS_KEY, {})
  return { ...DEFAULT_SETTINGS, ...raw, ambientSound: normalizeAmbientSound(raw) }
}
export const saveSettings = (settings) => saveJSON(SETTINGS_KEY, settings)
// Merges a partial update into existing settings — saveSettings overwrites
// the whole object, so independent features (cycle length, theme, chime)
// must go through this to avoid clobbering each other's keys.
export function patchSettings(patch) {
  const next = { ...loadSettings(), ...patch }
  saveSettings(next)
  return next
}

// Ticks: her pomodoro/kesinti için hafif kayıt (günlük/haftalık raporlar için)
const TICKS_KEY = 'pomodoro_ticks'
function normalizeTick(t) {
  return {
    id: t.id,
    type: t.type,
    date: t.date,
    timestamp: t.timestamp ?? null,
    ...normalizeMeta(t),
  }
}
export const loadTicks = () => loadJSON(TICKS_KEY, []).map(normalizeTick)
export const saveTicks = (items) => saveJSON(TICKS_KEY, items)
export function addTick(tick) {
  const ticks = loadTicks()
  ticks.push(stampCreated(tick))
  saveTicks(ticks)
  notifyChange()
  return ticks
}

// Kesinti butonuna yanlışlıkla basılırsa geri almak için: aynı türden en
// son tick'i siler.
export function removeLastTick(type) {
  const ticks = loadTicks()
  for (let i = ticks.length - 1; i >= 0; i--) {
    if (ticks[i].type === type) {
      ticks.splice(i, 1)
      saveTicks(ticks)
      notifyChange()
      break
    }
  }
  return ticks
}

// Timetable: gün içi pomodoro setleri için planlanan zaman blokları (örn. 09:00-11:00)
const TIMETABLE_KEY = 'pomodoro_timetable'
function normalizeTimetableBlock(block) {
  return {
    id: block.id,
    date: block.date,
    start: block.start,
    end: block.end,
    label: block.label ?? '',
    ...normalizeMeta(block),
  }
}
export const loadTimetable = () => loadJSON(TIMETABLE_KEY, []).map(normalizeTimetableBlock)
export const saveTimetable = (blocks) => saveJSON(TIMETABLE_KEY, blocks)

// Categories: kullanıcı tanımlı, isim + renk. Inventory/Today/Records'taki
// eski serbest metin "type" alanının yerini alıyor — bkz. normalizeInventoryItem
// vb. Bir kategori silinirse referans veren kayıtlar sadece "kategorisiz"
// görünür (cascade delete yok); bu da eski/silinmiş bir categoryId'yi eski
// serbest-metin type değeriyle aynı şekilde ele almamızı sağlıyor.
const CATEGORIES_KEY = 'pomodoro_categories'
function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    color: category.color ?? null,
    // Local-only bookkeeping (never sent to Supabase — see signInToRemote's
    // migration snapshot below): true for a still-pristine, auto-seeded
    // default category (useCategories.js's seedDefaultCategories), false
    // once the user creates their own or edits a default one (updateCategory
    // clears it, since an edited category is real user data, not a
    // reproducible default anymore).
    isDefault: category.isDefault ?? false,
    ...normalizeMeta(category),
  }
}
export const loadCategories = () => loadJSON(CATEGORIES_KEY, []).map(normalizeCategory)
export const saveCategories = (categories) => saveJSON(CATEGORIES_KEY, categories)

// Void log: a Pomodoro void (Rule 1) with an optional reason — deliberately a
// simple daily journal, not an aggregated metric. Reports never reads this
// key; it only shows up as a plain per-entry line in RecordsLog.
const VOID_LOG_KEY = 'pomodoro_void_log'
function normalizeVoidEntry(entry) {
  return {
    id: entry.id,
    date: entry.date,
    time: entry.time ?? '',
    activity: entry.activity ?? null,
    categoryIds: Array.isArray(entry.categoryIds) ? entry.categoryIds : [],
    elapsedSeconds: entry.elapsedSeconds ?? 0,
    reason: entry.reason ?? '',
    ...normalizeMeta(entry),
  }
}
export const loadVoidLog = () => loadJSON(VOID_LOG_KEY, []).map(normalizeVoidEntry)
export const saveVoidLog = (entries) => saveJSON(VOID_LOG_KEY, entries)
export function addVoidLogEntry(entry) {
  const log = loadVoidLog()
  log.push(stampCreated(entry))
  saveVoidLog(log)
  notifyChange()
  return log
}
export function removeVoidLogEntry(id) {
  const log = loadVoidLog().filter((e) => e.id !== id)
  saveVoidLog(log)
  notifyChange()
  return log
}

// Timer state: sayfa yenilenince devam eden pomodoro'nun kaybolmaması için
// sessionType/secondsLeft/isRunning'in anlık görüntüsü.
const TIMER_STATE_KEY = 'pomodoro_timer_state'
const DEFAULT_WORK_SECONDS = 25 * 60
function normalizeTimerState(state) {
  if (!state) return null
  return {
    sessionType: state.sessionType ?? 'work',
    secondsLeft: state.secondsLeft ?? DEFAULT_WORK_SECONDS,
    isRunning: state.isRunning ?? false,
    // Epoch-ms timestamp the running countdown should hit 0 at, or `null`
    // while idle/paused. Lets usePomodoro recompute secondsLeft from the
    // wall clock (Date.now() vs endAt) instead of trusting an accumulated
    // per-tick decrement, which drifts under browser tab-throttling and
    // goes stale entirely across a reload/tab-close.
    endAt: state.endAt ?? null,
    ...normalizeMeta(state),
  }
}
export const loadTimerState = () => normalizeTimerState(loadJSON(TIMER_STATE_KEY, null))
export const saveTimerState = (state) => saveJSON(TIMER_STATE_KEY, state)

// Danger Zone (Settings tab): category-scoped resets, each removing only its
// own key(s). Settings is deliberately never touched by any of these — only
// resetAllData() below resets it, per the "settings survive a data reset"
// requirement.
//
// All async, awaiting activeProvider.remove() — for a signed-in user that's
// remoteProvider's remove(), a real network call. Callers (SettingsModal.jsx)
// await these before reloading the page: reloading immediately after firing
// an unawaited delete was racing (and usually winning against) the actual
// Supabase request, silently aborting it, so Danger Zone actions appeared to
// do nothing for a signed-in account. See remoteProvider.js's remove() for
// the full write-up.
export async function clearInventory() {
  await activeProvider.remove(INVENTORY_KEY)
}
// Timetable blocks are today-scoped planning data with the same lifecycle as
// Today's Tasks, so clearing "Today's Tasks" clears both.
export async function clearTodayTasks() {
  await Promise.all([activeProvider.remove(TODAY_KEY), activeProvider.remove(TIMETABLE_KEY)])
}
export async function clearActivityLog() {
  await activeProvider.remove(ACTIVITY_LOG_KEY)
}
export async function clearTicks() {
  await activeProvider.remove(TICKS_KEY)
}
export async function clearTimerState() {
  await activeProvider.remove(TIMER_STATE_KEY)
}
export async function clearCategories() {
  await activeProvider.remove(CATEGORIES_KEY)
}
export async function clearVoidLog() {
  await activeProvider.remove(VOID_LOG_KEY)
}

// Reset to Factory Settings: removes every key, including Settings — the one
// case where settings themselves are wiped, returning the app to its
// first-launch state.
export async function resetAllData() {
  await Promise.all([
    activeProvider.remove(INVENTORY_KEY),
    activeProvider.remove(TODAY_KEY),
    activeProvider.remove(TIMETABLE_KEY),
    activeProvider.remove(ACTIVITY_LOG_KEY),
    activeProvider.remove(TICKS_KEY),
    activeProvider.remove(TIMER_STATE_KEY),
    activeProvider.remove(CATEGORIES_KEY),
    activeProvider.remove(VOID_LOG_KEY),
    activeProvider.remove(SETTINGS_KEY),
  ])
}

// Full backup of every storage key, for the export feature.
export function exportAllData() {
  return {
    exportedAt: new Date().toISOString(),
    inventory: loadInventory(),
    todayTasks: loadTodayTasks(),
    activityLog: loadActivityLog(),
    ticks: loadTicks(),
    settings: loadSettings(),
    timetable: loadTimetable(),
    categories: loadCategories(),
    voidLog: loadVoidLog(),
  }
}

// Data import (Settings): the counterpart to exportAllData()/CSV export.
// `data` is assumed already validated (importData.js's validateBackupShape)
// by the caller — this function only decides how to write it, not whether
// it's safe to.
//
// 'replace' wipes each collection and writes the file's contents as-is,
// including settings (mirrors resetAllData()'s "settings included" case).
// 'merge' resolves each array collection by id via mergeCollectionById
// (newer `updatedAt` wins) and deliberately leaves `settings` untouched —
// a merge is about reconciling *data*, not silently overwriting the user's
// current preferences (theme/language/cycle length) with whatever the
// imported file happened to have at export time.
export function importBackup(data, mode) {
  if (mode === 'replace') {
    if (Array.isArray(data.inventory)) saveInventory(data.inventory)
    if (Array.isArray(data.todayTasks)) saveTodayTasks(data.todayTasks)
    if (Array.isArray(data.activityLog)) saveActivityLog(data.activityLog)
    if (Array.isArray(data.ticks)) saveTicks(data.ticks)
    if (Array.isArray(data.timetable)) saveTimetable(data.timetable)
    if (Array.isArray(data.categories)) saveCategories(data.categories)
    if (Array.isArray(data.voidLog)) saveVoidLog(data.voidLog)
    if (data.settings && typeof data.settings === 'object') saveSettings(data.settings)
  } else {
    if (Array.isArray(data.inventory)) saveInventory(mergeCollectionById(loadInventory(), data.inventory))
    if (Array.isArray(data.todayTasks)) saveTodayTasks(mergeCollectionById(loadTodayTasks(), data.todayTasks))
    if (Array.isArray(data.activityLog)) saveActivityLog(mergeCollectionById(loadActivityLog(), data.activityLog))
    if (Array.isArray(data.ticks)) saveTicks(mergeCollectionById(loadTicks(), data.ticks))
    if (Array.isArray(data.timetable)) saveTimetable(mergeCollectionById(loadTimetable(), data.timetable))
    if (Array.isArray(data.categories)) saveCategories(mergeCollectionById(loadCategories(), data.categories))
    if (Array.isArray(data.voidLog)) saveVoidLog(mergeCollectionById(loadVoidLog(), data.voidLog))
  }
  notifyChange()
}

// CSV import (Records Log / Activity Log only). `rows` is already-validated,
// already-parsed CSV data (importData.js's parseCSV + validateActivityCSV).
// 'replace' wipes the Activity Log and writes the CSV's records as new,
// fresh-id records. 'merge' adds only rows that don't match an existing
// record by (date, time, activity) — see mergeActivityRecordsByNaturalKey's
// comment for why CSV can't merge by id/updatedAt the way JSON does.
export function importActivityLogCSV(rows, categories, mode) {
  const records = csvRowsToActivityRecords(rows, categories)
  if (mode === 'replace') {
    saveActivityLog(records)
  } else {
    saveActivityLog(mergeActivityRecordsByNaturalKey(loadActivityLog(), records))
  }
  notifyChange()
}

// Provider swap (Authentication, see CLAUDE.md): called from App.jsx when
// useAuth's `user` transitions from null to a real session. Simply fetches
// the account's existing Supabase data via remoteProvider.js's
// initializeRemoteData() and warms its cache — no local/guest data is read,
// touched, or merged in here. Signing in never migrates local data
// automatically; a user who wants their guest-mode data in their account
// uses the manual JSON/CSV export-then-import feature in Settings > Data
// instead (DataTransfer.jsx / importBackup below), which is a separate,
// deliberate, user-initiated action.
//
// Only flips activeProvider on success — every loadX()/saveX() call made
// before that still went through localStorageProvider, so a failure here
// (network error, etc.) leaves localStorage completely untouched; the
// caller is expected to keep treating the session as guest/local for this
// run and surface `error` to the user.
export async function signInToRemote(userId) {
  const result = await remoteProvider.initializeRemoteData(userId)
  if (!result.error) {
    activeProvider = remoteProvider
    await seedDefaultCategoriesRemotely()
  }
  return result
}

// Runs once per account, right after a successful sign-in — mirrors
// useCategories.js's own local seeding (same DEFAULT_CATEGORY_SEEDS list,
// same translate() call) but writes straight to whichever collection
// activeProvider now points at (remoteProvider, by this point in
// signInToRemote). Guarded by the *account's own* defaultCategoriesSeeded
// flag (now synced remotely as part of the settings singleton) so it only
// ever runs once per account, the same one-time-only pattern useCategories.js
// uses locally for guests — signing in again later, from any device, never
// re-seeds. If the account already has categories of its own (from an
// earlier device), there's nothing to seed; just stop asking.
async function seedDefaultCategoriesRemotely() {
  const settings = loadSettings()
  if (settings.defaultCategoriesSeeded) return
  if (loadCategories().length === 0) {
    const language = resolveLanguage(settings.language)
    saveCategories(
      DEFAULT_CATEGORY_SEEDS.map(({ labelKey, colorIndex }) => ({
        id: crypto.randomUUID(),
        name: translate(language, `defaultCategories.${labelKey}`),
        color: CATEGORY_COLORS[colorIndex].value,
      }))
    )
  }
  patchSettings({ defaultCategoriesSeeded: true })
}

// Called on sign-out — switches back to localStorage exactly as it was
// (remoteProvider.resetToLocalMode() drops its in-memory cache so a later
// sign-in starts clean rather than reusing a previous user's data).
export function signOutFromRemote() {
  remoteProvider.resetToLocalMode()
  activeProvider = localStorageProvider
}

// GuestSignupNudge's one-time "seen" flag (see App.jsx) — deliberately a
// raw, dedicated localStorage key rather than a DEFAULT_SETTINGS field like
// seenCoachMarks/onboardingDismissed. Those go through activeProvider, so
// for a signed-in user they'd become part of every settings upsert to
// Supabase (and would need a matching column). This flag is guest-only by
// definition (the nudge never shows once signed in — see App.jsx's `!user`
// gate) and has no reason to ever exist in an account's synced settings, so
// it bypasses the provider abstraction entirely and always reads/writes
// real browser localStorage, regardless of which provider is currently
// active — it simply isn't part of the account data model.
const GUEST_SIGNUP_NUDGE_KEY = 'pomodoro_guest_signup_nudge_seen'
export function hasSeenGuestSignupNudge() {
  return localStorage.getItem(GUEST_SIGNUP_NUDGE_KEY) === 'true'
}
export function markGuestSignupNudgeSeen() {
  localStorage.setItem(GUEST_SIGNUP_NUDGE_KEY, 'true')
}

// Cross-tab sync: the native 'storage' event fires in *other* tabs/windows
// when one of them writes to localStorage (never in the tab that wrote it).
// Re-dispatching our own change event lets RecordsLog/Reports — which
// already subscribe via subscribeToChanges() — pick up edits made in
// another tab without a manual refresh. e.key is null on localStorage.clear().
const SYNCED_KEYS = [
  INVENTORY_KEY,
  TODAY_KEY,
  ACTIVITY_LOG_KEY,
  SETTINGS_KEY,
  TICKS_KEY,
  TIMETABLE_KEY,
  CATEGORIES_KEY,
  VOID_LOG_KEY,
]

window.addEventListener('storage', (e) => {
  if (e.key === null || SYNCED_KEYS.includes(e.key)) {
    notifyChange()
  }
})
