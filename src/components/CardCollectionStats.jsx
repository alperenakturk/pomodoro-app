import { useEffect, useState } from 'react'
import { loadCardDraws, subscribeToChanges } from '../lib/storage'
import { ALL_CATEGORY_IDS, RARE_CATEGORY_ID, summarizeCardDraws } from '../lib/motivationCategories'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateLocalized } from '../lib/i18n'
import { CategoryIcon } from './MotivationOverlay'

// Settings > Achievements — a simple stats view over the card-draw history
// (see storage.js's pomodoro_card_draws / motivationCategories.js's
// summarizeCardDraws). Reads storage directly on mount and on
// pomodoro-data-changed, same self-contained pattern as RecordsLog/Reports,
// rather than threading cardDraws through App.jsx as a prop.
function CardCollectionStats() {
  const { t, localeTag } = useTranslation()
  const [draws, setDraws] = useState(() => loadCardDraws())

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => setDraws(loadCardDraws()))
    return unsubscribe
  }, [])

  const summary = summarizeCardDraws(draws)

  if (summary.totalDraws === 0) {
    return (
      <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-10 text-center">
        <p className="text-sage text-sm font-sans">{t('motivationStats.noDrawsYet')}</p>
      </div>
    )
  }

  const firstRareDate = summary.firstRareAt ? summary.firstRareAt.slice(0, 10) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label={t('motivationStats.totalDrawsLabel')} value={summary.totalDraws} />
        <StatBox
          label={t('motivationStats.distinctCategoriesLabel')}
          value={`${summary.distinctCategoriesSeen}/${ALL_CATEGORY_IDS.length}`}
        />
        <StatBox label={t('motivationStats.rareFoundLabel')} value={summary.rareCount} accent />
      </div>

      <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-3 flex items-center justify-between">
        <span className="text-sage text-xs font-sans">{t('motivationStats.firstRareLabel')}</span>
        <span className={`text-xs font-sans font-semibold ${firstRareDate ? 'text-amber' : 'text-sage/60'}`}>
          {firstRareDate ? formatDateLocalized(firstRareDate, localeTag) : t('motivationStats.firstRareNone')}
        </span>
      </div>

      <div className="bg-pine-dark border border-cream/10 rounded-2xl px-4 py-4">
        <p className="text-sage text-[10px] font-sans tracking-widest uppercase mb-3">
          {t('motivationStats.byCategoryTitle')}
        </p>
        <div className="flex flex-col gap-2.5">
          {ALL_CATEGORY_IDS.map((id) => (
            <div key={id} className="flex items-center gap-3">
              <CategoryIcon category={id} className="w-5 h-5 flex-shrink-0" />
              <span className="text-cream text-sm font-sans flex-1">{t(`motivation.categories.${id}.label`)}</span>
              <span className={`text-sm font-sans font-semibold ${id === RARE_CATEGORY_ID ? 'text-amber' : 'text-sage'}`}>
                {summary.byCategory[id]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sage/60 text-[11px] font-sans text-center italic">{t('motivationStats.achievementsFooter')}</p>
    </div>
  )
}

function StatBox({ label, value, accent = false }) {
  return (
    <div className="bg-pine-dark border border-cream/10 rounded-2xl px-3 py-3 flex flex-col items-center gap-1 text-center">
      <span className={`font-display text-2xl font-bold ${accent ? 'text-amber' : 'text-cream'}`}>{value}</span>
      <span className="text-sage text-[10px] font-sans leading-tight">{label}</span>
    </div>
  )
}

export default CardCollectionStats
