import { useState, memo } from 'react'
import { loadSettings } from '../lib/storage'
import { countAvailablePomodoros } from '../lib/pomodoroMath'
import { useTranslation } from '../hooks/useTranslation'
import CollapseToggle from './CollapseToggle'

// Standalone compact card now (design-mockups/07) — used to be an inline
// sub-panel nested inside TodoToday's own card; promoted to its own card
// once AvailablePomodoros/Inventory/Timetable moved out to the Planning
// tab's secondary column, alongside TodoToday instead of inside it.
function AvailablePomodoros({ plannedTotal, suggestedHours = 0 }) {
  const [hours, setHours] = useState('')
  const [open, setOpen] = useState(true)
  const cycleLength = loadSettings().cycleLength
  const { t } = useTranslation()

  const available =
    hours === '' ? null : countAvailablePomodoros(Math.max(0, Number(hours) * 60), cycleLength)

  const overPlanned = available != null && plannedTotal > available
  const roundedSuggestion = Math.round(suggestedHours * 2) / 2

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4 font-sans">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          {t('availablePomodoros.title')}
        </p>
        <CollapseToggle
          open={open}
          onToggle={() => setOpen((prev) => !prev)}
          label={t(open ? 'common.collapseSectionAria' : 'common.expandSectionAria', {
            section: t('availablePomodoros.title'),
          })}
        />
      </div>

      {open && (
        <>
          {available != null && (
            <p className="mb-2">
              <span className="font-display text-3xl text-cream tabular-nums">{available}</span>{' '}
              <span className="text-sage text-xs">{t('availablePomodoros.pomodorosAvailable')}</span>
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="available-hours" className="text-sage text-xs whitespace-nowrap">
              {t('availablePomodoros.hoursLabel')}
            </label>
            <input
              id="available-hours"
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={t('availablePomodoros.hoursPlaceholder')}
              className="w-16 bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
            />
            {roundedSuggestion > 0 && String(roundedSuggestion) !== hours && (
              <button
                type="button"
                onClick={() => setHours(String(roundedSuggestion))}
                className="text-sage text-xs underline decoration-dotted hover:text-tomato"
                title={t('availablePomodoros.useTimetableTitle')}
              >
                {t('availablePomodoros.useTimetableButton', { hours: roundedSuggestion })}
              </button>
            )}
          </div>
          {available != null && (
            <p className="text-xs mt-2">
              <span className={overPlanned ? 'text-tomato font-semibold' : 'text-sage'}>
                {t('availablePomodoros.plannedLabel', { count: plannedTotal })}
              </span>
              {overPlanned && (
                <span className="text-tomato">{t('availablePomodoros.overCapacity')}</span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// Memoized — see Inventory.jsx's identical note. plannedTotal/suggestedHours
// are plain numbers (see App.jsx's useMemo wrapping their computation) —
// primitive props compare correctly by value even across an unmemoized
// computation, so this needs no further prop-stabilization to be effective.
export default memo(AvailablePomodoros)
