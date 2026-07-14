import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import ThemePicker from './ThemePicker'

const STEPS = ['welcome', 'language', 'name', 'theme', 'goal']

// A first-time account setup wizard — deliberately a different mechanism
// from the coach-mark system (see constants.js's COACH_MARKS): this is a
// full-screen, opaque step flow shown once, right after a brand-new account
// finishes its very first sign-in (see App.jsx's isNewAccount, derived in
// remoteProvider.js), not a small dismissible hint card layered over the
// app. Every field is optional — "Skip setup" (visible on every step) exits
// immediately, and "Continue" always advances whether or not the current
// step's field was touched. Nothing here is saved separately from Settings:
// each step calls the exact same setter AppInner/SettingsModal already use
// (setDisplayName/onSelectTheme/etc.), so anything chosen before a skip is
// still kept, and the theme step's preview is the real app re-rendering
// live behind it, not a mock.
function AccountSetupFlow({
  onFinish,
  displayName,
  setDisplayName,
  theme,
  onSelectTheme,
  dailyPomodoroGoal,
  setDailyPomodoroGoal,
}) {
  const { t, language, setLanguage } = useTranslation()
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  function goNext() {
    if (isLastStep) {
      onFinish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  const languageLabels = {
    en: t('settings.languageEnglish'),
    tr: t('settings.languageTurkish'),
  }

  return (
    <div className="fixed inset-0 z-50 bg-pine flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        <p className="text-sage text-[11px] font-sans tracking-widest uppercase">
          {t('accountSetup.stepIndicator', { current: stepIndex + 1, total: STEPS.length })}
        </p>

        {step === 'welcome' && (
          <div className="flex flex-col items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-tomato" />
            <h1 className="font-display text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.welcome.title')}
            </h1>
            <p className="font-sans text-sage text-sm leading-relaxed max-w-sm">
              {t('accountSetup.welcome.body')}
            </p>
          </div>
        )}

        {step === 'language' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-display text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.language.title')}
            </h1>
            <div className="flex flex-wrap justify-center gap-2">
              {SUPPORTED_LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  aria-pressed={language === code}
                  className={
                    'font-sans text-sm px-4 py-2 rounded-xl border transition-colors ' +
                    (language === code
                      ? 'border-tomato text-cream bg-tomato/10'
                      : 'border-cream/15 text-sage hover:text-cream')
                  }
                >
                  {languageLabels[code]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'name' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-display text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.name.title')}
            </h1>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('settings.displayNamePlaceholder')}
              maxLength={40}
              autoFocus
              className="w-full max-w-xs text-center bg-cream/5 border border-cream/15 rounded-lg text-cream placeholder:text-sage/40 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-3 py-2 text-sm"
            />
          </div>
        )}

        {step === 'theme' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-display text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.theme.title')}
            </h1>
            <div className="flex flex-wrap justify-center gap-2">
              <ThemePicker value={theme} onSelect={onSelectTheme} />
            </div>
          </div>
        )}

        {step === 'goal' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-display text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.goal.title')}
            </h1>
            <p className="font-sans text-sage text-sm leading-relaxed max-w-sm">{t('accountSetup.goal.body')}</p>
            <input
              type="number"
              min="1"
              max="50"
              value={dailyPomodoroGoal ?? ''}
              onChange={(e) => setDailyPomodoroGoal(e.target.value === '' ? null : Number(e.target.value))}
              placeholder={t('accountSetup.goal.placeholder')}
              autoFocus
              className="w-24 text-center bg-cream/5 border border-cream/15 rounded-lg text-cream placeholder:text-sage/40 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-3 w-full mt-2">
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="font-sans text-sm px-4 py-2 rounded-xl border border-cream/20 text-cream"
              >
                {t('accountSetup.backButton')}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="font-sans text-sm px-6 py-2 rounded-xl bg-tomato text-cream font-semibold"
            >
              {isLastStep ? t('accountSetup.finishButton') : t('accountSetup.continueButton')}
            </button>
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="font-sans text-xs text-sage hover:text-cream underline decoration-dotted"
          >
            {t('accountSetup.skipButton')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountSetupFlow
