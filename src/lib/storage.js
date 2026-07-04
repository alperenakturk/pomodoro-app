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

// Activity Inventory: ana görev havuzu
const INVENTORY_KEY = 'pomodoro_inventory'
export const loadInventory = () => loadJSON(INVENTORY_KEY, [])
export const saveInventory = (items) => saveJSON(INVENTORY_KEY, items)

// To Do Today: bugüne seçilen görevler
const TODAY_KEY = 'pomodoro_today_tasks'
export const loadTodayTasks = () => loadJSON(TODAY_KEY, [])
export const saveTodayTasks = (items) => saveJSON(TODAY_KEY, items)

// Records: tamamlanan görevlerin Tahmin/Gerçek/Fark kaydı
const ACTIVITY_LOG_KEY = 'pomodoro_activity_log'
export const loadActivityLog = () => loadJSON(ACTIVITY_LOG_KEY, [])
export const saveActivityLog = (items) => saveJSON(ACTIVITY_LOG_KEY, items)
export function addActivityRecord(record) {
  const log = loadActivityLog()
  log.push(record)
  saveActivityLog(log)
  notifyChange()
  return log
}

// Ticks: her pomodoro/kesinti için hafif kayıt (günlük/haftalık raporlar için)
const TICKS_KEY = 'pomodoro_ticks'
export const loadTicks = () => loadJSON(TICKS_KEY, [])
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
