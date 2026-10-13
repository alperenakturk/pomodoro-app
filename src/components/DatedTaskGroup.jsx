import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateLocalized } from '../lib/i18n'
import { inputClass } from '../lib/constants'
import { tomorrowString } from '../lib/dateKey'

// A task that isn't part of today's live list: either left over from an
// earlier day ("carried") or postponed to a later one ("later"). Carried
// tasks never move on their own — the user chooses per task: bring it to
// today, postpone it to a date, or delete it. See useTodayTasks.js's
// bucketTasksByDay for how tasks end up here.
function DatedTaskRow({ task, kind, onMoveToToday, onPostpone, onRemove }) {
  const { t, localeTag } = useTranslation()
  const [postponeDate, setPostponeDate] = useState('')
  const dateLabel = formatDateLocalized(task.date, localeTag)

  return (
    <li className="flex flex-col gap-2 bg-cream/5 rounded-xl px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-cream text-sm font-sans break-words min-w-0">{task.text}</span>
        <span className="text-sage text-[10px] font-sans whitespace-nowrap">
          {t(kind === 'carried' ? 'today.fromDate' : 'today.forDate', { date: dateLabel })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onMoveToToday(task.id)}
          className="font-sans text-xs px-3 py-1 rounded-full bg-tomato text-on-tomato"
        >
          {t('today.moveToToday')}
        </button>
        {kind === 'carried' && (
          <>
            <input
              type="date"
              min={tomorrowString()}
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              aria-label={t('today.postponeAria')}
              className={`px-2 py-1 text-xs ${inputClass}`}
            />
            <button
              type="button"
              disabled={!postponeDate}
              onClick={() => onPostpone(task.id, postponeDate)}
              className="font-sans text-xs px-3 py-1 rounded-full border border-cream/20 text-cream disabled:opacity-40"
            >
              {t('today.postponeButton')}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="font-sans text-xs px-3 py-1 rounded-full text-tomato-text ml-auto"
        >
          {t('common.delete')}
        </button>
      </div>
    </li>
  )
}

function DatedTaskGroup({ titleKey, emptyKey, kind, tasks, onMoveToToday, onPostpone, onRemove }) {
  const { t } = useTranslation()

  return (
    <section aria-label={t(titleKey)} className="flex flex-col gap-2">
      <p className="text-sage text-xs font-sans uppercase tracking-wide">
        {t(titleKey)} ({tasks.length})
      </p>
      {tasks.length === 0 && <p className="text-sage/70 text-sm font-sans py-1">{t(emptyKey)}</p>}
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <DatedTaskRow
            key={task.id}
            task={task}
            kind={kind}
            onMoveToToday={onMoveToToday}
            onPostpone={onPostpone}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </section>
  )
}

export default DatedTaskGroup
