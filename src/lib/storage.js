function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
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
  }
}
export const loadActivityLog = () => loadJSON(ACTIVITY_LOG_KEY, []).map(normalizeActivityRecord)
export const saveActivityLog = (items) => saveJSON(ACTIVITY_LOG_KEY, items)
export function addActivityRecord(record) {
  const log = loadActivityLog()
  log.push(record)
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
  const log = loadActivityLog().map((r) => (r.id === id ? { ...r, ...patch } : r))
  saveActivityLog(log)
  notifyChange()
  return log
}

// Settings: kullanıcı tarafından ayarlanabilen tercihler (örn. long break'e
// kaç pomodorodan sonra geçileceği)
const SETTINGS_KEY = 'pomodoro_settings'
const DEFAULT_SETTINGS = { cycleLength: 4, theme: 'dark', chimeStyle: 'classic' }
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...loadJSON(SETTINGS_KEY, {}) })
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
  }
}
export const loadTicks = () => loadJSON(TICKS_KEY, []).map(normalizeTick)
export const saveTicks = (items) => saveJSON(TICKS_KEY, items)
export function addTick(tick) {
  const ticks = loadTicks()
  ticks.push(tick)
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
  }
}
export const loadVoidLog = () => loadJSON(VOID_LOG_KEY, []).map(normalizeVoidEntry)
export const saveVoidLog = (entries) => saveJSON(VOID_LOG_KEY, entries)
export function addVoidLogEntry(entry) {
  const log = loadVoidLog()
  log.push(entry)
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
  }
}
export const loadTimerState = () => normalizeTimerState(loadJSON(TIMER_STATE_KEY, null))
export const saveTimerState = (state) => saveJSON(TIMER_STATE_KEY, state)

// Danger Zone (Settings tab): category-scoped resets, each removing only its
// own key(s). Settings is deliberately never touched by any of these — only
// resetAllData() below resets it, per the "settings survive a data reset"
// requirement.
export function clearInventory() {
  localStorage.removeItem(INVENTORY_KEY)
}
// Timetable blocks are today-scoped planning data with the same lifecycle as
// Today's Tasks, so clearing "Today's Tasks" clears both.
export function clearTodayTasks() {
  localStorage.removeItem(TODAY_KEY)
  localStorage.removeItem(TIMETABLE_KEY)
}
export function clearActivityLog() {
  localStorage.removeItem(ACTIVITY_LOG_KEY)
}
export function clearTicks() {
  localStorage.removeItem(TICKS_KEY)
}
export function clearTimerState() {
  localStorage.removeItem(TIMER_STATE_KEY)
}
export function clearCategories() {
  localStorage.removeItem(CATEGORIES_KEY)
}
export function clearVoidLog() {
  localStorage.removeItem(VOID_LOG_KEY)
}

// Reset to Factory Settings: removes every key, including Settings — the one
// case where settings themselves are wiped, returning the app to its
// first-launch state.
export function resetAllData() {
  localStorage.removeItem(INVENTORY_KEY)
  localStorage.removeItem(TODAY_KEY)
  localStorage.removeItem(TIMETABLE_KEY)
  localStorage.removeItem(ACTIVITY_LOG_KEY)
  localStorage.removeItem(TICKS_KEY)
  localStorage.removeItem(TIMER_STATE_KEY)
  localStorage.removeItem(CATEGORIES_KEY)
  localStorage.removeItem(VOID_LOG_KEY)
  localStorage.removeItem(SETTINGS_KEY)
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
