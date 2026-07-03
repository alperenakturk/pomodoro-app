import { useState } from 'react'

function Inventory({ items, addItem, removeItem, onSendToToday }) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    addItem(text.trim(), estimate ? Number(estimate) : null)
    setText('')
    setEstimate('')
  }

  return (
    <div className="bg-cream rounded-3xl px-6 py-6 shadow-xl w-full h-full">
      <p className="font-display text-tomato text-xs tracking-widest uppercase mb-4">
        Envanter
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Yeni iş..."
          className="flex-1 font-sans text-sm px-3 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <input
          type="number"
          min="1"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="pom."
          className="w-16 font-sans text-sm px-2 py-2 rounded-xl border border-sage/40 text-ink outline-none focus:border-tomato"
        />
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-xl bg-tomato text-cream"
        >
          Ekle
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {items.length === 0 && (
          <li className="text-sage text-sm font-sans text-center py-2">
            Envanter boş.
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 font-sans text-sm text-ink"
          >
            <span className="flex-1">{item.text}</span>
            {item.estimate && (
              <span className="text-sage text-xs">{item.estimate} pom.</span>
            )}
            <button
              type="button"
              onClick={() => onSendToToday(item.text, item.estimate, item.id)}
              className="text-tomato text-xs"
            >
              Bugüne ekle
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-sage text-xs"
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Inventory
