import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { ACHIEVEMENT_DEFINITIONS } from '../lib/achievements'
import { setForceRareNextDraw } from '../lib/devMode'

// Developer Mode's one UI surface — both the always-visible proof it's
// active (so dev-mode behavior never gets mistaken for a real bug while
// testing normally) and the trigger surface for the action-style
// conveniences. Only ever mounted when lib/devMode.js's DEV_MODE is true,
// which is stripped from the production bundle entirely — so, deliberately
// unlike the rest of the app, this file's own chrome strings are plain
// hardcoded English rather than routed through t()/en.js/tr.js: this
// surface has zero real-user audience, and localizing it would add
// permanent dictionary weight for a screen nobody but the developer ever
// sees. The achievement picker's own labels below are real app content
// (t()'d titleKeys), not this panel's chrome, so those stay translated.
function DevModePanel({ actions }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [rareArmed, setRareArmed] = useState(false)
  const [selectedAchievementId, setSelectedAchievementId] = useState(ACHIEVEMENT_DEFINITIONS[0]?.id ?? '')

  function toggleForceRare() {
    const next = !rareArmed
    setRareArmed(next)
    setForceRareNextDraw(next)
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] font-sans text-xs">
      {open && (
        <div className="mb-2 w-64 bg-pine-dark border border-amber/40 rounded-xl p-3 shadow-2xl flex flex-col gap-2">
          <p className="text-amber-text font-bold tracking-wide uppercase text-[10px] mb-1">Developer Mode</p>

          <button
            type="button"
            onClick={actions.instantComplete}
            className="text-left px-2 py-1.5 rounded-lg border border-cream/15 text-cream hover:bg-cream/10"
          >
            Instant complete current session
          </button>

          <button
            type="button"
            onClick={toggleForceRare}
            className={
              'text-left px-2 py-1.5 rounded-lg border ' +
              (rareArmed ? 'border-amber bg-amber/10 text-amber-text' : 'border-cream/15 text-cream hover:bg-cream/10')
            }
          >
            {rareArmed ? 'Next card draw = Rare (armed)' : 'Force next card draw = Rare'}
          </button>

          <div className="flex flex-col gap-1 px-2 py-1.5 rounded-lg border border-cream/15">
            <label htmlFor="dev-achievement-select" className="text-sage text-[10px] uppercase tracking-wide">
              Preview achievement toast
            </label>
            <div className="flex gap-1">
              <select
                id="dev-achievement-select"
                value={selectedAchievementId}
                onChange={(e) => setSelectedAchievementId(e.target.value)}
                className="flex-1 min-w-0 bg-cream/5 border border-cream/15 rounded text-cream text-xs px-1 py-1"
              >
                {ACHIEVEMENT_DEFINITIONS.map((def) => (
                  <option key={def.id} value={def.id}>
                    {t(def.titleKey)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => actions.previewAchievementToast(selectedAchievementId)}
                className="px-2 py-1 rounded bg-tomato text-on-tomato"
              >
                Fire
              </button>
            </div>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => actions.previewStreakCelebration('increment')}
              className="flex-1 text-left px-2 py-1.5 rounded-lg border border-cream/15 text-cream hover:bg-cream/10"
            >
              Preview streak: day
            </button>
            <button
              type="button"
              onClick={() => actions.previewStreakCelebration('milestone')}
              className="flex-1 text-left px-2 py-1.5 rounded-lg border border-cream/15 text-cream hover:bg-cream/10"
            >
              Preview streak: milestone
            </button>
          </div>

          <button
            type="button"
            onClick={actions.resetSeenFlags}
            className="text-left px-2 py-1.5 rounded-lg border border-cream/15 text-cream hover:bg-cream/10"
          >
            Reset seen flags and reload
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          'px-3 py-1.5 rounded-full border font-bold tracking-widest uppercase text-[10px] shadow-lg ' +
          (open ? 'bg-amber text-pine border-amber' : 'bg-pine-dark text-amber-text border-amber/50')
        }
      >
        DEV
      </button>
    </div>
  )
}

export default DevModePanel
