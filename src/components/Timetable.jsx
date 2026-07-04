import { useState, useEffect } from 'react'
import { isCurrentBlock } from '../lib/timetable'

function currentTimeString(date) {
  return date.toTimeString().slice(0, 5)
}

function Timetable({ blocks, addBlock, removeBlock }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [label, setLabel] = useState('')
  const [now, setNow] = useState(() => new Date())

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
    <div className="bg-cream/5 border border-cream/10 rounded-xl px-3 py-3 mb-4 font-sans">
      <p className="text-sage text-[10px] uppercase tracking-wide mb-2">Today's timetable</p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-2 items-center flex-wrap">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-label="Block start time"
          className="bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
        />
        <span className="text-sage text-xs">–</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          aria-label="Block end time"
          className="bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          aria-label="Block label"
          className="flex-1 min-w-[80px] bg-cream/5 border border-cream/15 rounded-lg text-cream placeholder:text-sage/50 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-cream"
        >
          Add
        </button>
      </form>

      {blocks.length === 0 ? (
        <p className="text-sage text-xs text-center py-1">No time blocks planned yet.</p>
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
                  {active && <span className="text-tomato"> (now)</span>}
                </span>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="text-sage"
                  aria-label={`remove block ${block.start}-${block.end}`}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Timetable
