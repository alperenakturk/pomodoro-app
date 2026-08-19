import { useTranslation } from '../hooks/useTranslation'
import { isFeatureVisible } from '../lib/experienceMode'

const TABS = [
  { id: 'timer', labelKey: 'tabs.timer' },
  { id: 'planning', labelKey: 'tabs.planning' },
  { id: 'reports', labelKey: 'tabs.reports', featureId: 'reportsTab' },
]

function TabNav({ activeTab, onChange, mode, className = '' }) {
  const { t } = useTranslation()
  const tabs = TABS.filter((tab) => !tab.featureId || isFeatureVisible(mode, tab.featureId))
  return (
    <nav className={`flex gap-2 justify-center flex-wrap ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className={
            'font-display text-[11px] tracking-widest uppercase px-4 py-2 rounded-full border transition-colors ' +
            (activeTab === tab.id
              ? 'bg-tomato border-tomato text-on-tomato font-semibold shadow-sm'
              : 'border-cream/15 text-sage hover:border-cream/30 hover:text-cream')
          }
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  )
}

export default TabNav
