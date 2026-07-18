import { useState, useEffect, memo } from 'react'
import { isCurrentBlock } from '../lib/timetable'
import { useTranslation } from '../hooks/useTranslation'
import CollapseToggle from './CollapseToggle'

function currentTimeString(date) {
  return date.toTimeString().slice(0, 5)
}

// Standalone compact card now (design-mockups/07) — see AvailablePomodoros.jsx
// for the same "used to be nested inside TodoToday" note.
function Timetable({ blocks, addBlock, removeBlock }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [label, setLabel] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [open, setOpen] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  const nowString = currentTimeString(now)

  function handleAdd(e) {
    e.preventDefault()
    if (!start || !end || end <= start) return
    addBlock(start, end, label.trim())
    setStart('')
    setEnd('')
    setLabel('')
  }

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4 font-sans">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase">
          {t('timetable.title')}
        </p>
        <CollapseToggle
          open={open}
          onToggle={() => setOpen((prev) => !prev)}
          label={t(open ? 'common.collapseSectionAria' : 'common.expandSectionAria', {
            section: t('timetable.title'),
          })}
        />
      </div>

      {open && (
        <>
          <form onSubmit={handleAdd} className="flex gap-2 mb-2 items-center flex-wrap">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label={t('timetable.startAria')}
              className="bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
            />
            <span className="text-sage text-xs">–</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label={t('timetable.endAria')}
              className="bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('timetable.labelPlaceholder')}
              aria-label={t('timetable.labelAria')}
              className="flex-1 min-w-[80px] bg-cream/5 border border-cream/15 rounded-lg text-cream placeholder:text-sage/50 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
            />
            <button
              type="submit"
              className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-on-tomato"
            >
              {t('timetable.addButton')}
            </button>
          </form>

          {blocks.length === 0 ? (
            <p className="text-sage text-xs text-center py-1">{t('timetable.emptyState')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {blocks.map((block) => {
                const active = isCurrentBlock(block, nowString)
                return (
                  <li
                    key={block.id}
                    className={`flex items-center justify-between text-xs rounded-lg px-2 py-1 ${
                      active ? 'bg-tomato/15 border border-tomato/40' : ''
                    }`}
                  >
                    <span className={active ? 'text-tomato font-semibold' : 'text-cream'}>
                      {block.start}–{block.end}
                      {block.label && <span className="text-sage font-normal"> · {block.label}</span>}
                      {active && <span className="text-tomato">{t('timetable.nowSuffix')}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="text-sage"
                      aria-label={t('timetable.removeAria', { start: block.start, end: block.end })}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// Memoized — see Inventory.jsx's identical note. blocks/addBlock/removeBlock
// are already stable across unrelated re-renders (useTimetable's own state +
// useCallback), so this needs no App.jsx-side changes to be effective.
export default memo(Timetable)
