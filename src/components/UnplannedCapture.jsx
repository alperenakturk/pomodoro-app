import { inputClass } from '../lib/constants'
import { useTranslation } from '../hooks/useTranslation'

// The "Unplanned & Urgent" capture point: per methodology (Internal/External
// interruption handling protocols), a sudden task or interruption should be
// jotted down and left for later, not acted on mid-Pomodoro. This is
// intentionally add-only (no list here) — showing the accumulating list
// during a work session would itself become a distraction; the list lives
// on the Planning tab instead.
function UnplannedCapture({ addTask, className = '' }) {
  const { t } = useTranslation()

  function handleSubmit(e) {
    e.preventDefault()
    const value = e.target.elements.unplannedText.value.trim()
    if (!value) return
    addTask(value, null, { unplanned: true, urgent: true })
    e.target.reset()
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input
        name="unplannedText"
        type="text"
        placeholder={t('unplanned.placeholder')}
        aria-label={t('unplanned.aria')}
        className={`flex-1 ${inputClass}`}
      />
      <button
        type="submit"
        className="font-sans text-sm px-4 py-2 rounded-xl border border-cream/20 text-cream"
      >
        {t('unplanned.addButton')}
      </button>
    </form>
  )
}

export default UnplannedCapture
