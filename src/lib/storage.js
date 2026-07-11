import { mergeCollectionById, csvRowsToActivityRecords, mergeActivityRecordsByNaturalKey } from './importData'
import * as remoteProvider from './remoteProvider'

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
// detected the first time. `onboardingDismissed` gates the Timer tab's
// first-launch welcome card — set true once the user dismisses it, so it
// never shows again even if they later clear all their data.
const DEFAULT_SETTINGS = {
  cycleLength: 4,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundVolume: 100,
  ambientSound: 'none',
  checkToBottom: false,
  theme: 'light-terracotta',
  chimeStyle: 'classic',
  userId: 'local',
  language: null,
  onboardingDismissed: false,
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
export function clearInventory() {
  activeProvider.remove(INVENTORY_KEY)
}
// Timetable blocks are today-scoped planning data with the same lifecycle as
// Today's Tasks, so clearing "Today's Tasks" clears both.
export function clearTodayTasks() {
  activeProvider.remove(TODAY_KEY)
  activeProvider.remove(TIMETABLE_KEY)
}
export function clearActivityLog() {
  activeProvider.remove(ACTIVITY_LOG_KEY)
}
export function clearTicks() {
  activeProvider.remove(TICKS_KEY)
}
export function clearTimerState() {
  activeProvider.remove(TIMER_STATE_KEY)
}
export function clearCategories() {
  activeProvider.remove(CATEGORIES_KEY)
}
export function clearVoidLog() {
  activeProvider.remove(VOID_LOG_KEY)
}

// Reset to Factory Settings: removes every key, including Settings — the one
// case where settings themselves are wiped, returning the app to its
// first-launch state.
export function resetAllData() {
  activeProvider.remove(INVENTORY_KEY)
  activeProvider.remove(TODAY_KEY)
  activeProvider.remove(TIMETABLE_KEY)
  activeProvider.remove(ACTIVITY_LOG_KEY)
  activeProvider.remove(TICKS_KEY)
  activeProvider.remove(TIMER_STATE_KEY)
  activeProvider.remove(CATEGORIES_KEY)
  activeProvider.remove(VOID_LOG_KEY)
  activeProvider.remove(SETTINGS_KEY)
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
// useAuth's `user` transitions from null to a real session. Gathers a
// snapshot via this file's own loadX() functions (still hitting
// localStorage — activeProvider hasn't switched yet) and hands it to
// remoteProvider.js's initializeRemoteData(), which fetches the account's
// existing Supabase data and merges the two by id/updatedAt (same
// mergeCollectionById() the JSON import feature uses).
//
// Only flips activeProvider on success — every loadX()/saveX() call made
// before that (including everything gathered into localSnapshots above)
// still went through localStorageProvider, so a failure here (network
// error, etc.) leaves localStorage completely untouched; the caller is
// expected to keep treating the session as guest/local for this run and
// surface `error` to the user. Clearing localStorage once migration
// succeeds is the caller's job too (App.jsx), not this function's — this
// file only decides which provider is active, not when it's safe to delete
// the old data.
// Whether this guest session has anything actually worth asking the user
// about before merging into a Supabase account — App.jsx uses this to
// decide whether sign-in needs a confirmation prompt at all. Deliberately
// scoped to the data collections that genuinely get *combined* on merge
// (mergeCollectionById, same as JSON import); pomodoro_settings/timer_state
// are singletons where an existing remote row always wins outright
// regardless (see initializeRemoteData), so a guest-only theme tweak isn't
// the kind of "local change" this prompt is about.
export function hasLocalGuestData() {
  return (
    loadInventory().length > 0 ||
    loadTodayTasks().length > 0 ||
    loadActivityLog().length > 0 ||
    loadTicks().length > 0 ||
    loadTimetable().length > 0 ||
    loadCategories().length > 0 ||
    loadVoidLog().length > 0 ||
    loadTimerState() !== null
  )
}

// `skipLocalMerge: true` is how App.jsx honors a user declining the merge
// prompt (see hasLocalGuestData) — passing empty snapshots means
// initializeRemoteData just fetches the account's existing remote data with
// nothing to combine it with. `result.migrated` then stays false, so the
// caller's usual clearLocalGuestData() step never runs either — the
// declined local data is left exactly as it was, neither merged nor
// deleted.
export async function signInToRemote(userId, { skipLocalMerge = false } = {}) {
  const localSnapshots = skipLocalMerge
    ? {}
    : {
        pomodoro_inventory: loadInventory(),
        pomodoro_today_tasks: loadTodayTasks(),
        pomodoro_activity_log: loadActivityLog(),
        pomodoro_ticks: loadTicks(),
        pomodoro_timetable: loadTimetable(),
        pomodoro_categories: loadCategories(),
        pomodoro_void_log: loadVoidLog(),
        pomodoro_timer_state: loadTimerState(),
        pomodoro_settings: loadSettings(),
      }
  const result = await remoteProvider.initializeRemoteData(userId, localSnapshots)
  if (!result.error) activeProvider = remoteProvider
  return result
}

// Called on sign-out — switches back to localStorage exactly as it was
// (remoteProvider.resetToLocalMode() drops its in-memory cache so a later
// sign-in starts clean rather than reusing a previous user's data).
export function signOutFromRemote() {
  remoteProvider.resetToLocalMode()
  activeProvider = localStorageProvider
}

// Called by App.jsx only after signInToRemote() resolves with no error AND
// result.migrated is true — i.e. there really was guest data, and it has
// already been safely merged into Supabase. Removes the raw localStorage
// keys directly (bypassing the provider abstraction, since this is
// specifically about deleting the *old* local copies regardless of which
// provider is active now) rather than calling resetAllData(), which also
// wipes pomodoro_settings — a signed-in user's settings now live in
// Supabase and clearing the local copy here is just tidying up the old
// storage, not a user-facing "reset."
export function clearLocalGuestData() {
  localStorage.removeItem(INVENTORY_KEY)
  localStorage.removeItem(TODAY_KEY)
  localStorage.removeItem(ACTIVITY_LOG_KEY)
  localStorage.removeItem(TICKS_KEY)
  localStorage.removeItem(TIMETABLE_KEY)
  localStorage.removeItem(CATEGORIES_KEY)
  localStorage.removeItem(VOID_LOG_KEY)
  localStorage.removeItem(TIMER_STATE_KEY)
  localStorage.removeItem(SETTINGS_KEY)
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
