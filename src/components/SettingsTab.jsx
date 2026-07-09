import { unlockAudio, playChime, CHIME_STYLES } from '../lib/alert'
import { DEFAULT_CYCLE_LENGTH } from '../hooks/usePomodoro'
import Select from './Select'

const CHIME_LABELS = {
  classic: 'Classic',
  soft: 'Soft',
  alert: 'Alert',
}

const rowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-cream/10 last:border-b-0'

function SettingsTab({
  cycleLength,
  setCycleLength,
  resetCycleLength,
  chimeStyle,
  setChimeStyle,
  theme,
  onToggleTheme,
}) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-black/20 border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full">
        <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-2">
          Settings
        </p>

        <div className={rowClass}>
          <label htmlFor="cycle-length">Long break every</label>
          <div className="flex items-center gap-2">
            <input
              id="cycle-length"
              type="number"
              min="1"
              max="12"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="w-12 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream px-1 py-1"
            />
            <span>pomodoro</span>
            {cycleLength !== DEFAULT_CYCLE_LENGTH && (
              <button
                type="button"
                onClick={resetCycleLength}
                className="underline decoration-dotted text-cream"
                title={`Reset to default (${DEFAULT_CYCLE_LENGTH})`}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className={rowClass}>
          <label htmlFor="chime-style">Sound</label>
          <div className="flex items-center gap-2">
            <Select
              id="chime-style"
              value={chimeStyle}
              options={CHIME_STYLES}
              labels={CHIME_LABELS}
              onChange={setChimeStyle}
            />
            <button
              type="button"
              onClick={() => {
                unlockAudio()
                playChime(chimeStyle)
              }}
              className="underline decoration-dotted text-cream"
            >
              Test
            </button>
          </div>
        </div>

        <div className={rowClass}>
          <span>Theme</span>
          <button
            type="button"
            onClick={onToggleTheme}
            title="Toggle light/dark theme"
            className="text-cream border border-cream/15 rounded-full px-3 py-1"
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>

        {/* Not wired up yet — surfacing the category here so the Settings tab
            reflects the full intended settings set, without adding new timer
            duration/i18n logic as part of this layout pass. */}
        <div className={`${rowClass} text-sage/50`}>
          <span>Short/long break duration</span>
          <span className="italic">Coming soon</span>
        </div>

        <div className={`${rowClass} text-sage/50`}>
          <span>Language</span>
          <span className="italic">Coming soon</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab
