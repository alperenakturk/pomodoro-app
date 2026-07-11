import { useEffect, useState } from 'react'
import { loadTicks, loadActivityLog, subscribeToChanges } from '../lib/storage'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateLocalized } from '../lib/i18n'
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
  totalFocusMinutes,
  formatFocusDuration,
} from '../lib/reportsMath'
import DayReview from './DayReview'

const PERIODS = [
  { id: 'today', labelKey: 'reports.periodToday' },
  { id: 'week', labelKey: 'reports.periodWeek' },
  { id: 'month', labelKey: 'reports.periodMonth' },
  { id: 'year', labelKey: 'reports.periodYear' },
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

function TodaySection({ ticks, activityLog, todayTasks, period, workMinutes }) {
  const { t } = useTranslation()
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

  // Unlike its three siblings above (always a fixed today-vs-yesterday
  // comparison), this stat follows the top-of-page period filter — the same
  // Today/Week/Month/Year scope EstimationAccuracySection etc. use — so it
  // reads "total focus time this week/month/year" when a wider period is
  // selected, not just today's.
  const focusMinutes = totalFocusMinutes(ticks, datesForPeriod(period), workMinutes)

  return (
    <div className="grid grid-cols-2 gap-3 font-sans">
      <Stat
        label={t('reports.totalFocusTime')}
        value={formatFocusDuration(focusMinutes)}
      />
      <Stat
        label={t('reports.pomodorosToday')}
        value={todayPomodoros}
        trend={<TrendArrow direction={trendDirection(todayPomodoros, yesterdayPomodoros)} goodDirection={null} />}
      />
      <Stat
        label={t('reports.tasksToday')}
        value={t('reports.tasksTodayValue', { active: activeToday, done: completedToday })}
      />
      <Stat
        label={t('reports.interruptionsToday')}
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
  const { t } = useTranslation()
  const periodRecords = recordsWithEffectiveDiff(recordsInDates(activityLog, datesForPeriod(period)))
  const chartRecords = takeLast(periodRecords, 20)
  const { overestimated, underestimated } = estimationBreakdown(periodRecords)

  const thisWeekAvg = avgAbsDiff(recordsInDates(activityLog, datesForThisWeek()))
  const lastWeekAvg = avgAbsDiff(recordsInDates(activityLog, datesForLastWeek()))

  // Distinct from hasNoHistoryYet (same-day-only data overall) — this is
  // "the selected period genuinely has zero records," most commonly hit by
  // picking "Today" on a day nothing's been finished yet. Without this, the
  // stat boxes show 0/0, the caption shows "(0)", and DiffTrend renders its
  // own separate empty message below them — three redundant "nothing here"
  // signals stacked on top of each other, which is what looked broken.
  if (periodRecords.length === 0) {
    return <p className="text-sage text-xs font-sans text-center py-2">{t('reports.noDataForPeriod')}</p>
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 font-sans mb-4">
        <Stat label={t('reports.overestimated')} value={overestimated} />
        <Stat label={t('reports.underestimated')} value={underestimated} />
      </div>

      <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
        {t('reports.diffChartCaption', { count: chartRecords.length })}
      </p>
      <DiffTrend records={chartRecords} />

      <div className="mt-4 pt-4 border-t border-cream/10 flex items-center justify-center gap-2 font-sans text-xs text-sage">
        <span>{t('reports.avgErrorThisWeek', { value: thisWeekAvg == null ? '-' : thisWeekAvg.toFixed(1) })}</span>
        <span>·</span>
        <span>{t('reports.avgErrorLastWeek', { value: lastWeekAvg == null ? '-' : lastWeekAvg.toFixed(1) })}</span>
        <TrendArrow direction={trendDirection(thisWeekAvg, lastWeekAvg)} goodDirection="down" />
      </div>
    </div>
  )
}

function InterruptionTrendsSection({ activityLog, period }) {
  const { t } = useTranslation()
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
        <span className="text-sage text-xs">{t('reports.avgInterruptionsPerTask')}</span>
      </div>
      <div className="flex items-center justify-center gap-2 font-sans text-xs text-sage mb-4">
        <span>{t('reports.thisWeek', { value: thisWeekAvg == null ? '-' : thisWeekAvg.toFixed(1) })}</span>
        <span>·</span>
        <span>{t('reports.lastWeek', { value: lastWeekAvg == null ? '-' : lastWeekAvg.toFixed(1) })}</span>
        <TrendArrow direction={trendDirection(thisWeekAvg, lastWeekAvg)} goodDirection="down" />
      </div>

      {recentTasks.length === 0 ? (
        <p className="text-sage text-xs font-sans text-center py-2">{t('reports.noDataForPeriod')}</p>
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
                  {t('reports.interruptionCount', { count, internal: r.internal || 0, external: r.external || 0 })}
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
  const { t } = useTranslation()
  const periodRecords = recordsInDates(activityLog, datesForPeriod(period))
  const buckets = pomodorosByCategory(periodRecords, categories, t('reports.uncategorized'))
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))

  if (buckets.length === 0) {
    return (
      <p className="text-sage text-xs font-sans text-center py-2">
        {t('reports.noDataForPeriod')}
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
            {t('reports.pomSuffix', { count: bucket.total })}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LongTermSection({ ticks, activityLog }) {
  const { t } = useTranslation()
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
        <span>{t('reports.longTermTitle')}</span>
        <span>{expanded ? t('reports.collapse') : t('reports.expand')}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          <p className="text-sage text-[10px] font-sans uppercase tracking-wide mb-2 text-center">
            {t('reports.activityCaption')}
          </p>
          <ActivityHeatmap ticks={ticks} />

          <div className="grid grid-cols-2 gap-3 font-sans mt-4 pt-4 border-t border-cream/10">
            <Stat label={t('reports.pomodorosThisMonth')} value={monthPomodoros} />
            <Stat label={t('reports.pomodorosThisQuarter')} value={quarterPomodoros} />
            <Stat
              label={t('reports.avgInterruptionsMonth')}
              value={monthAvgInterruptions == null ? '-' : monthAvgInterruptions.toFixed(1)}
            />
            <Stat
              label={t('reports.avgInterruptionsQuarter')}
              value={quarterAvgInterruptions == null ? '-' : quarterAvgInterruptions.toFixed(1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Reports({ todayTasks = [], categories = [], workMinutes = 25 }) {
  const { t } = useTranslation()
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
          {t('reports.title')}
        </p>
        <button
          type="button"
          onClick={() => setShowReview(true)}
          className="text-tomato text-xs font-sans"
        >
          {t('reports.reviewToday')}
        </button>
      </div>

      {ticks.length === 0 && activityLog.length === 0 ? (
        <p className="text-sage text-sm font-sans text-center py-6">{t('reports.noDataAtAll')}</p>
      ) : (
        <>
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
                {t(p.labelKey)}
              </button>
            ))}
          </div>

          {hasNoHistoryYet(ticks, activityLog) && (
            <p className="text-sage/60 text-[11px] font-sans italic text-center -mt-2 mb-6">
              {t('reports.noHistoryHint')}
            </p>
          )}

          <section className="mb-6">
            <TodaySection
              ticks={ticks}
              activityLog={activityLog}
              todayTasks={todayTasks}
              period={period}
              workMinutes={workMinutes}
            />
          </section>

          <section className="mb-6 pt-4 border-t border-cream/10">
            <p className="font-display text-cream font-bold text-[11px] tracking-widest uppercase mb-4 text-center">
              {t('reports.estimationAccuracyTitle')}
            </p>
            <EstimationAccuracySection activityLog={activityLog} period={period} />
          </section>

          <section className="mb-6 pt-4 border-t border-cream/10">
            <p className="font-display text-cream font-bold text-[11px] tracking-widest uppercase mb-4 text-center">
              {t('reports.interruptionTrendsTitle')}
            </p>
            <InterruptionTrendsSection activityLog={activityLog} period={period} />
          </section>

          <section className="mb-6 pt-4 border-t border-cream/10">
            <p className="font-display text-cream font-bold text-[11px] tracking-widest uppercase mb-4 text-center">
              {t('reports.categoryBreakdownTitle')}
            </p>
            <CategoryBreakdownSection activityLog={activityLog} categories={categories} period={period} />
          </section>

          <section className="pt-4 border-t border-cream/10">
            <LongTermSection ticks={ticks} activityLog={activityLog} />
          </section>
        </>
      )}

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
  const { t, localeTag } = useTranslation()
  const totalDays = HEATMAP_WEEKS * 7
  const days = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  const countByDate = {}
  for (const tick of ticks) {
    if (tick.type !== 'pomodoro') continue
    countByDate[tick.date] = (countByDate[tick.date] || 0) + 1
  }

  const columns = []
  for (let col = 0; col < HEATMAP_WEEKS; col++) {
    columns.push(days.slice(col * 7, col * 7 + 7))
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-[3px]" role="img" aria-label={t('reports.heatmapAriaLabel')}>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((date) => {
              const count = countByDate[date] || 0
              const tooltipKey = count === 1 ? 'reports.heatmapTooltipOne' : 'reports.heatmapTooltipOther'
              return (
                <span
                  key={date}
                  className={`w-2.5 h-2.5 rounded-sm ${bucketClass(count)}`}
                  title={t(tooltipKey, { date: formatDateLocalized(date, localeTag), count })}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-sage text-[10px] font-sans">
        <span>{t('reports.less')}</span>
        {[0, 1, 3, 5, 7].map((count) => (
          <span key={count} className={`w-2.5 h-2.5 rounded-sm ${bucketClass(count)}`} />
        ))}
        <span>{t('reports.more')}</span>
      </div>
    </div>
  )
}

function DiffTrend({ records }) {
  const { t } = useTranslation()

  if (records.length === 0) {
    return (
      <p className="text-sage text-xs font-sans text-center py-2">
        {t('reports.noEstimatedTasks')}
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
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={t('reports.diffChartAriaLabel')}>
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
                <title>
                  {t('reports.diffTooltip', {
                    activity: r.activity,
                    diff: diff > 0 ? `+${diff}` : diff,
                    reestimated: r.diffI != null ? t('reports.diffTooltipReestimated') : '',
                  })}
                </title>
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
          {t('reports.tookLonger')}
        </span>
        <span className="flex items-center gap-1 text-sage text-[10px] font-sans">
          <span className="w-2 h-2 rounded-full bg-amber inline-block" />
          {t('reports.tookLess')}
        </span>
      </div>
    </div>
  )
}

export default Reports
