import { useTranslation } from '../hooks/useTranslation'

const TABS = [
  { id: 'timer', labelKey: 'tabs.timer' },
  { id: 'planning', labelKey: 'tabs.planning' },
  { id: 'reports', labelKey: 'tabs.reports' },
]

function TabNav({ activeTab, onChange, className = '' }) {
  const { t } = useTranslation()
  return (
    <nav className={`flex gap-2 justify-center flex-wrap ${className}`}>
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
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  )
}

export default TabNav
