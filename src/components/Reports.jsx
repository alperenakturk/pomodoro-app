import { useEffect, useState } from 'react'
import { loadTicks, loadActivityLog, subscribeToChanges } from '../lib/storage'
import {
  todayString,
  datesForYesterday,
  datesForThisWeek,
  datesForLastWeek,
  datesForMonth,
  datesForQuarter,
  datesForPeriod,
  effectiveDiff,
  countTicksInDates,
  recordsInDates,
  recordsWithEffectiveDiff,
  estimationBreakdown,
  avgAbsDiff,
  avgInterruptionsPerTask,
  trendDirection,
  takeLast,
  hasNoHistoryYet,
  pomodorosByCategory,
} from '../lib/reportsMath'
import DayReview from './DayReview'

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
]

// direction: 'up' | 'down' | 'flat' from trendDirection().
// goodDirection: which raw direction counts as improvement — 'up', 'down',
// or null for metrics (like raw pomodoro count) the methodology doesn't
// treat as inherently better when higher.
function TrendArrow({ direction, goodDirection }) {
  if (direction === 'flat') return <span className="text-sage">→</span>
  const glyph = direction === 'up' ? '↑' : '↓'
  const colorClass =
    goodDirection == null
      ? 'text-sage'
      : direction === goodDirection
        ? 'text-cream'
        : 'text-tomato'
  return <span className={colorClass}>{glyph}</span>
}

function Stat({ label, value, trend }) {
  return (
    <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 text-center">
      <p className="font-display text-2xl text-cream flex items-center justify-center gap-1.5">
        {value}
        {trend}
      </p>
      <p className="text-sage text-xs mt-1">{label}</p>
    </div>
  )
}

function TodaySection({ ticks, activityLog, todayTasks }) {
  const today = [todayString()]
  const yesterday = datesForYesterday()

  const todayPomodoros = countTicksInDates(ticks, 'pomodoro', today)
  const yesterdayPomodoros = countTicksInDates(ticks, 'pomodoro', yesterday)

  const todayInterruptions =
    countTicksInDates(ticks, 'interruption-internal', today) +
    countTicksInDates(ticks, 'interruption-external', today)
  const yesterdayInterruptions =
    countTicksInDates(ticks, 'interruption-internal', yesterday) +
    countTicksInDates(ticks, 'interruption-external', yesterday)

  const completedToday = recordsInDates(activityLog, today).length
  const activeToday = todayTasks.filter((t) => !t.done).length

  return (
    <div className="grid grid-cols-3 gap-3 font-sans">
      <Stat
        label="Pomodoros today"
        value={todayPomodoros}
        trend={<TrendArrow direction={trendDirection(todayPomodoros, yesterdayPomodoros)} goodDirection={null} />}
      />
      <Stat label="Tasks today" value={`${activeToday} active · ${completedToday} done`} />
      <Stat
        label="Interruptions today"
        value={todayInterruptions}
        trend={
          <TrendArrow
            direction={trendDirection(todayInterruptions, yesterdayInterruptions)}
            goodDirection="down"
          />
        }
      />
    </div>
  )
}

function EstimationAccuracySection({ activityLog, period }) {
  const periodRecords = recordsWithEffectiveDiff(recordsInDates(activityLog, datesForPeriod(period)))
  const chartRecords = takeLast(periodRecords, 20)
  const { overestimated, underestimated } = estimationBreakdown(periodRecords)

  const thisWeekAvg = avgAbsDiff(recordsInDates(activityLog, datesForThisWeek()))
  const lastWeekAvg = avgAbsDiff(recordsInDates(activityLog, datesForLastWeek()))

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 font-sans mb-4">
        <Stat label="Overestimated (took less)" value={overestimated} />
        <Stat label="Underestimated (took longer)" value={underestimated} />
      </div>

      <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
        Estimate vs. real, per task ({chartRecords.length})
      </p>
      <DiffTrend records={chartRecords} />

      <div className="mt-4 pt-4 border-t border-cream/10 flex items-center justify-center gap-2 font-sans text-xs text-sage">
        <span>Avg error this week: {thisWeekAvg == null ? '-' : thisWeekAvg.toFixed(1)}</span>
        <span>·</span>
        <span>last week: {lastWeekAvg == null ? '-' : lastWeekAvg.toFixed(1)}</span>
        <TrendArrow direction={trendDirection(thisWeekAvg, lastWeekAvg)} goodDirection="down" />
      </div>
    </div>
  )
}

function InterruptionTrendsSection({ activityLog, period }) {
  const periodRecords = recordsInDates(activityLog, datesForPeriod(period))
  const avgPerTask = avgInterruptionsPerTask(periodRecords)

  const thisWeekAvg = avgInterruptionsPerTask(recordsInDates(activityLog, datesForThisWeek()))
  const lastWeekAvg = avgInterruptionsPerTask(recordsInDates(activityLog, datesForLastWeek()))

  const recentTasks = takeLast(periodRecords, 8).reverse()
  const maxInterruptions = Math.max(1, ...recentTasks.map((r) => (r.internal || 0) + (r.external || 0)))

  return (
    <div>
      <div className="flex items-center justify-center gap-2 font-sans text-sm text-cream mb-1">
        <span className="font-display text-xl">{avgPerTask == null ? '-' : avgPerTask.toFixed(1)}</span>
        <span className="text-sage text-xs">avg interruptions per task</span>
      </div>
      <div className="flex items-center justify-center gap-2 font-sans text-xs text-sage mb-4">
        <span>this week: {thisWeekAvg == null ? '-' : thisWeekAvg.toFixed(1)}</span>
        <span>·</span>
        <span>last week: {lastWeekAvg == null ? '-' : lastWeekAvg.toFixed(1)}</span>
        <TrendArrow direction={trendDirection(thisWeekAvg, lastWeekAvg)} goodDirection="down" />
      </div>

      {recentTasks.length === 0 ? (
        <p className="text-sage text-xs font-sans text-center py-2">No tasks finished in this period.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 font-sans">
          {recentTasks.map((r) => {
            const count = (r.internal || 0) + (r.external || 0)
            return (
              <li key={r.id} className="flex items-center gap-2 text-xs">
                <span className="text-cream truncate w-32 flex-shrink-0" title={r.activity}>
                  {r.activity}
                </span>
                <span className="flex-1 h-2 bg-cream/5 rounded-full overflow-hidden">
                  <span
                    className="block h-full bg-tomato/60 rounded-full"
                    style={{ width: `${(count / maxInterruptions) * 100}%` }}
                  />
                </span>
                <span className="text-sage w-24 text-right flex-shrink-0">
                  {count} ({r.internal || 0} int · {r.external || 0} ext)
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function CategoryBreakdownSection({ activityLog, categories, period }) {
  const periodRecords = recordsInDates(activityLog, datesForPeriod(period))
  const buckets = pomodorosByCategory(periodRecords, categories)
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))

  if (buckets.length === 0) {
    return (
      <p className="text-sage text-xs font-sans text-center py-2">
        No pomodoros logged against finished tasks in this period.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5 font-sans">
      {buckets.map((bucket) => (
        <li key={bucket.id} className="flex items-center gap-2 text-xs">
          <span className="text-cream truncate w-24 flex-shrink-0" title={bucket.name}>
            {bucket.name}
          </span>
          <span className="flex-1 h-2 bg-cream/5 rounded-full overflow-hidden">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(bucket.total / maxTotal) * 100}%`,
                backgroundColor: bucket.color ?? 'var(--color-sage)',
              }}
            />
          </span>
          <span className="text-sage w-16 text-right flex-shrink-0">
            {bucket.total} pom.
          </span>
        </li>
      ))}
    </ul>
  )
}

function LongTermSection({ ticks, activityLog }) {
  const [expanded, setExpanded] = useState(false)

  const monthDates = datesForMonth()
  const quarterDates = datesForQuarter()
  const monthPomodoros = countTicksInDates(ticks, 'pomodoro', monthDates)
  const quarterPomodoros = countTicksInDates(ticks, 'pomodoro', quarterDates)
  const monthAvgInterruptions = avgInterruptionsPerTask(recordsInDates(activityLog, monthDates))
  const quarterAvgInterruptions = avgInterruptionsPerTask(recordsInDates(activityLog, quarterDates))

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between font-sans text-xs text-sage uppercase tracking-wide"
      >
        <span>Long-term</span>
        <span>{expanded ? '▾ collapse' : '▸ expand'}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
            Activity (last 13 weeks)
          </p>
          <ActivityHeatmap ticks={ticks} />

          <div className="grid grid-cols-2 gap-3 font-sans mt-4 pt-4 border-t border-cream/10">
            <Stat label="Pomodoros this month" value={monthPomodoros} />
            <Stat label="Pomodoros this quarter" value={quarterPomodoros} />
            <Stat
              label="Avg interruptions/task (month)"
              value={monthAvgInterruptions == null ? '-' : monthAvgInterruptions.toFixed(1)}
            />
            <Stat
              label="Avg interruptions/task (quarter)"
              value={quarterAvgInterruptions == null ? '-' : quarterAvgInterruptions.toFixed(1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Reports({ todayTasks = [], categories = [] }) {
  const [ticks, setTicks] = useState(() => loadTicks())
  const [activityLog, setActivityLog] = useState(() => loadActivityLog())
  const [showReview, setShowReview] = useState(false)
  const [period, setPeriod] = useState('week')

  // Polling yerine: veri her değiştiğinde anında haber al.
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      setTicks(loadTicks())
      setActivityLog(loadActivityLog())
    })
    return unsubscribe
  }, [])

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

      <div className="flex gap-2 justify-center flex-wrap mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            aria-current={period === p.id ? 'page' : undefined}
            className={
              'font-display text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full border ' +
              (period === p.id
                ? 'bg-tomato/15 border-tomato/60 text-tomato'
                : 'border-cream/15 text-sage hover:border-cream/30')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {hasNoHistoryYet(ticks, activityLog) && (
        <p className="text-sage/60 text-[11px] font-sans italic text-center -mt-2 mb-6">
          Not enough history yet — filters will differ as you use the app across more days.
        </p>
      )}

      <section className="mb-6">
        <TodaySection ticks={ticks} activityLog={activityLog} todayTasks={todayTasks} />
      </section>

      <section className="mb-6 pt-4 border-t border-cream/10">
        <p className="font-display text-cream font-bold text-[11px] tracking-widest uppercase mb-4 text-center">
          Estimation Accuracy
        </p>
        <EstimationAccuracySection activityLog={activityLog} period={period} />
      </section>

      <section className="mb-6 pt-4 border-t border-cream/10">
        <p className="font-display text-cream font-bold text-[11px] tracking-widest uppercase mb-4 text-center">
          Interruption Trends
        </p>
        <InterruptionTrendsSection activityLog={activityLog} period={period} />
      </section>

      <section className="mb-6 pt-4 border-t border-cream/10">
        <p className="font-display text-cream font-bold text-[11px] tracking-widest uppercase mb-4 text-center">
          Pomodoros by Category
        </p>
        <CategoryBreakdownSection activityLog={activityLog} categories={categories} period={period} />
      </section>

      <section className="pt-4 border-t border-cream/10">
        <LongTermSection ticks={ticks} activityLog={activityLog} />
      </section>

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

export default Reports
