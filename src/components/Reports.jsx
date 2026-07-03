import { useEffect, useState } from 'react'
import { loadTicks, loadActivityLog, subscribeToChanges } from '../lib/storage'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function lastNDaysStrings(n) {
  const days = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function Reports() {
  const [ticks, setTicks] = useState(() => loadTicks())
  const [activityLog, setActivityLog] = useState(() => loadActivityLog())

  // Polling yerine: veri her değiştiğinde anında haber al.
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      setTicks(loadTicks())
      setActivityLog(loadActivityLog())
    })
    return unsubscribe
  }, [])

  const today = todayString()
  const last7 = lastNDaysStrings(7)

  const todayPomodoros = ticks.filter(
    (t) => t.type === 'pomodoro' && t.date === today
  ).length

  const weekPomodoros = ticks.filter(
    (t) => t.type === 'pomodoro' && last7.includes(t.date)
  ).length

  const internalCount = ticks.filter(
    (t) => t.type === 'interruption-internal' && last7.includes(t.date)
  ).length

  const externalCount = ticks.filter(
    (t) => t.type === 'interruption-external' && last7.includes(t.date)
  ).length

  // Qualitative error: plansız çıkıp gün içinde eklenen görevlerin sayısı.
  const unplannedCount = activityLog.filter(
    (r) => r.unplanned && last7.includes(r.date)
  ).length

  return (
    <div className="bg-cream rounded-3xl px-6 py-6 shadow-xl w-full h-full">
      <p className="font-display text-tomato text-xs tracking-widest uppercase mb-4">
        Raporlar
      </p>

      <div className="grid grid-cols-2 gap-3 font-sans">
        <Stat label="Bugün" value={todayPomodoros} />
        <Stat label="Son 7 gün" value={weekPomodoros} />
        <Stat label="İç kesinti (7g)" value={internalCount} />
        <Stat label="Dış kesinti (7g)" value={externalCount} />
        <div className="col-span-2">
          <Stat label="Plansız görev (7g)" value={unplannedCount} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-pine/5 rounded-xl px-3 py-3 text-center">
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="text-sage text-xs mt-1">{label}</p>
    </div>
  )
}

export default Reports
