import { useEffect, useState } from 'react'
import { loadTicks, loadActivityLog, subscribeToChanges } from '../lib/storage'
import DayReview from './DayReview'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

// A re-estimated task's original diff is stale once it's been revised —
// judge estimation accuracy against the most recent commitment (Diff II if
// it exists, else Diff I, else the original diff), matching the point of
// re-estimating in the first place.
function effectiveDiff(record) {
  return record.diffII ?? record.diffI ?? record.diff
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
  const [showReview, setShowReview] = useState(false)

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
  const recordsWithDiff = activityLog.filter((r) => effectiveDiff(r) != null)
  const recentDiffRecords = recordsWithDiff.slice(-10)
  const diffRecords7d = recordsWithDiff.filter((r) => last7.includes(r.date))
  const avgAbsDiff7d =
    diffRecords7d.length === 0
      ? null
      : diffRecords7d.reduce((sum, r) => sum + Math.abs(effectiveDiff(r)), 0) / diffRecords7d.length

  return (
    <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          Reports
        </p>
        <button
          type="button"
          onClick={() => setShowReview(true)}
          className="text-tomato text-xs font-sans"
        >
          Review today
        </button>
      </div>

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

      <div className="mt-4 pt-4 border-t border-cream/10">
        <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
          Activity (last 13 weeks)
        </p>
        <ActivityHeatmap ticks={ticks} />
      </div>

      {showReview && (
        <DayReview
          ticks={ticks}
          activityLog={activityLog}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  )
}

const HEATMAP_WEEKS = 13

function bucketClass(count) {
  if (count === 0) return 'bg-cream/5'
  if (count <= 2) return 'bg-tomato/25'
  if (count <= 4) return 'bg-tomato/50'
  if (count <= 6) return 'bg-tomato/75'
  return 'bg-tomato'
}

function ActivityHeatmap({ ticks }) {
  const totalDays = HEATMAP_WEEKS * 7
  const days = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  const countByDate = {}
  for (const t of ticks) {
    if (t.type !== 'pomodoro') continue
    countByDate[t.date] = (countByDate[t.date] || 0) + 1
  }

  const columns = []
  for (let col = 0; col < HEATMAP_WEEKS; col++) {
    columns.push(days.slice(col * 7, col * 7 + 7))
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-[3px]" role="img" aria-label="Daily Pomodoro activity, last 13 weeks">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((date) => {
              const count = countByDate[date] || 0
              return (
                <span
                  key={date}
                  className={`w-2.5 h-2.5 rounded-sm ${bucketClass(count)}`}
                  title={`${date}: ${count} pomodoro${count === 1 ? '' : 's'}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-sage text-[10px] font-sans">
        <span>Less</span>
        {[0, 1, 3, 5, 7].map((count) => (
          <span key={count} className={`w-2.5 h-2.5 rounded-sm ${bucketClass(count)}`} />
        ))}
        <span>More</span>
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
  const maxAbs = Math.max(1, ...records.map((r) => Math.abs(effectiveDiff(r))))
  const barWidth = Math.min(20, width / records.length - 4)
  const gap = (width - barWidth * records.length) / (records.length + 1)
  const maxIndex = records.reduce(
    (best, r, i) => (Math.abs(effectiveDiff(r)) > Math.abs(effectiveDiff(records[best])) ? i : best),
    0
  )

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Estimation diff per task">
        <line x1="0" y1={baseline} x2={width} y2={baseline} className="stroke-cream/15" strokeWidth="1" />
        {records.map((r, i) => {
          const diff = effectiveDiff(r)
          const x = gap + i * (barWidth + gap)
          const magnitude = Math.abs(diff)
          const isPositive = diff > 0
          const barHeight = diff === 0 ? 2 : Math.max(3, (magnitude / maxAbs) * maxHalf)
          const y = diff === 0 ? baseline - 1 : isPositive ? baseline - barHeight : baseline
          const colorClass = diff === 0 ? 'fill-sage/50' : isPositive ? 'fill-tomato' : 'fill-amber'
          const showLabel = i === maxIndex && magnitude > 0

          return (
            <g key={r.id}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="2" className={colorClass}>
                <title>{`${r.activity}: ${diff > 0 ? '+' : ''}${diff}${
                  r.diffI != null ? ' (re-estimated)' : ''
                }`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={isPositive ? y - 4 : y + barHeight + 10}
                  textAnchor="middle"
                  className="fill-cream"
                  style={{ fontSize: 9 }}
                >
                  {diff > 0 ? `+${diff}` : diff}
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
