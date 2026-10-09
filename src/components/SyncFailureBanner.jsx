import { useSyncFailure } from '../hooks/useSyncFailure'
import { useTranslation } from '../hooks/useTranslation'

function SyncFailureBanner() {
  const { t } = useTranslation()
  const failed = useSyncFailure()
  if (!failed) return null

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 bg-tomato text-cream text-sm text-center px-4 py-2 font-sans"
    >
      {t('syncFailure.message')}
    </div>
  )
}

export default SyncFailureBanner
