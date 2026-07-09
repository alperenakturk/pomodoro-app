const TABS = [
  { id: 'timer', label: 'Timer' },
  { id: 'planning', label: 'Planning' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]

function TabNav({ activeTab, onChange }) {
  return (
    <nav className="flex gap-2 justify-center flex-wrap px-4 sm:px-6 py-3 border-b border-cream/10">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className={
            'font-display text-[11px] tracking-widest uppercase px-4 py-2 rounded-full border ' +
            (activeTab === tab.id
              ? 'bg-tomato/15 border-tomato/60 text-tomato'
              : 'border-cream/15 text-sage hover:border-cream/30')
          }
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export default TabNav
