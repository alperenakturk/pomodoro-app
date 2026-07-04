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

  // Quantitative error trend: tahmin/gerçek farkının zamanla küçülüp
  // küçülmediğini görmek için son tahminli kayıtlar ve 7 günlük ortalama |fark|.
  const recordsWithDiff = activityLog.filter((r) => r.diff != null)
  const recentDiffRecords = recordsWithDiff.slice(-10)
  const diffRecords7d = recordsWithDiff.filter((r) => last7.includes(r.date))
  const avgAbsDiff7d =
    diffRecords7d.length === 0
      ? null
      : diffRecords7d.reduce((sum, r) => sum + Math.abs(r.diff), 0) / diffRecords7d.length

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
      <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-4">
        Reports
      </p>

      <div className="grid grid-cols-2 gap-3 font-sans">
        <Stat label="Today" value={todayPomodoros} />
        <Stat label="Last 7 days" value={weekPomodoros} />
        <Stat label="Internal interruptions (7d)" value={internalCount} />
        <Stat label="External interruptions (7d)" value={externalCount} />
        <div className="col-span-2">
          <Stat label="Unplanned tasks (7d)" value={unplannedCount} />
        </div>
        <div className="col-span-2">
          <Stat
            label="Avg estimation error (7d)"
            value={avgAbsDiff7d == null ? '-' : avgAbsDiff7d.toFixed(1)}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-cream/10">
        <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
          Estimation trend (last {recentDiffRecords.length || 0} tasks)
        </p>
        <DiffTrend records={recentDiffRecords} />
      </div>
    </div>
  )
}

function DiffTrend({ records }) {
  if (records.length === 0) {
    return (
      <p className="text-sage text-xs font-sans text-center py-2">
        No estimated tasks completed yet.
      </p>
    )
  }

  const width = 280
  const height = 64
  const baseline = height / 2
  const maxHalf = baseline - 12
  const maxAbs = Math.max(1, ...records.map((r) => Math.abs(r.diff)))
  const barWidth = Math.min(20, width / records.length - 4)
  const gap = (width - barWidth * records.length) / (records.length + 1)
  const maxIndex = records.reduce(
    (best, r, i) => (Math.abs(r.diff) > Math.abs(records[best].diff) ? i : best),
    0
  )

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Estimation diff per task">
        <line x1="0" y1={baseline} x2={width} y2={baseline} className="stroke-cream/15" strokeWidth="1" />
        {records.map((r, i) => {
          const x = gap + i * (barWidth + gap)
          const magnitude = Math.abs(r.diff)
          const isPositive = r.diff > 0
          const barHeight = r.diff === 0 ? 2 : Math.max(3, (magnitude / maxAbs) * maxHalf)
          const y = r.diff === 0 ? baseline - 1 : isPositive ? baseline - barHeight : baseline
          const colorClass = r.diff === 0 ? 'fill-sage/50' : isPositive ? 'fill-tomato' : 'fill-amber'
          const showLabel = i === maxIndex && magnitude > 0

          return (
            <g key={r.id}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="2" className={colorClass}>
                <title>{`${r.activity}: ${r.diff > 0 ? '+' : ''}${r.diff}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={isPositive ? y - 4 : y + barHeight + 10}
                  textAnchor="middle"
                  className="fill-cream"
                  style={{ fontSize: 9 }}
                >
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className="flex items-center gap-1 text-sage text-[10px] font-sans">
          <span className="w-2 h-2 rounded-full bg-tomato inline-block" />
          Took longer
        </span>
        <span className="flex items-center gap-1 text-sage text-[10px] font-sans">
          <span className="w-2 h-2 rounded-full bg-amber inline-block" />
          Took less
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
      <p className="font-display text-2xl text-cream">{value}</p>
      <p className="text-sage text-xs mt-1">{label}</p>
    </div>
  )
}

export default Reports
