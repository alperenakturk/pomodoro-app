import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import ThemePicker from './ThemePicker'

const BASE_STEPS = ['welcome', 'language', 'name', 'theme', 'goal']
// 'account' variant only — NOT spread into 'guestIntro's steps below. A
// guest can't actually use 'full' mode yet (resolveExperienceMode forces
// 'simple' for every guest regardless of what's picked here), so asking
// during guestIntro would be a choice with no live effect to preview,
// unlike theme. The guestIntro-then-signup path gets asked separately, via
// App.jsx's single-step `steps={['experienceMode']}` override, at the one
// moment the choice actually starts to matter — see App.jsx's
// showExperienceModeOnly.
const ACCOUNT_STEPS = ['welcome', 'experienceMode', 'language', 'name', 'theme', 'goal']

// A first-time account setup wizard — deliberately a different mechanism
// from the coach-mark system (see constants.js's COACH_MARKS): this is a
// full-screen, opaque step flow, not a small dismissible hint card layered
// over the app. Every field is optional — "Skip setup" (visible on every
// step) exits immediately, and "Continue" always advances whether or not
// the current step's field was touched. Nothing here is saved separately
// from Settings: each step calls the exact same setter AppInner/
// SettingsModal already use (setDisplayName/onSelectTheme/etc.), so
// anything chosen before a skip is still kept, and the theme step's preview
// is the real app re-rendering live behind it, not a mock.
//
// Two variants, driven by the same step flow:
//   'account' (default) — shown once, right after a brand-new account
//     finishes its very first sign-in (see App.jsx's isNewAccount, derived
//     in remoteProvider.js). `onFinish` fires on the last step.
//   'guestIntro' — shown once to a first-time guest, before they've ever
//     signed in (see storage.js's hasSeenGuestOnboarding). Appends one more
//     step, 'signup', pitching account creation; its own two buttons
//     (`onRequestSignUp`/`onContinueAsGuest`) replace the generic Continue/
//     Skip footer for that step only, since "finish" here isn't a single
//     action — see App.jsx's guestIntro wiring for what each one does with
//     whatever the user picked in the earlier steps.
function AccountSetupFlow({
  variant = 'account',
  steps: stepsOverride,
  onFinish,
  onContinueAsGuest,
  onRequestSignUp,
  displayName,
  setDisplayName,
  theme,
  onSelectTheme,
  experienceMode,
  onSelectExperienceMode,
  dailyPomodoroGoal,
  setDailyPomodoroGoal,
}) {
  const { t, language, setLanguage } = useTranslation()
  const [stepIndex, setStepIndex] = useState(0)
  // stepsOverride lets a caller run a single named step in isolation (see
  // App.jsx's showExperienceModeOnly) instead of the full variant-derived
  // flow — stepIndex naturally stays 0/isLastStep for a one-entry array, so
  // no other logic below needs to know this is a special case.
  const STEPS = stepsOverride ?? (variant === 'guestIntro' ? [...BASE_STEPS, 'signup'] : ACCOUNT_STEPS)
  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isSignupStep = step === 'signup'

  function goNext() {
    if (isLastStep) {
      onFinish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  // 'guestIntro' has no single "finish" — declining is a real, named choice
  // (onContinueAsGuest), not a fallback for "didn't get around to signing
  // up." The 'account' variant keeps its original onFinish semantics.
  function handleSkipEntirely() {
    if (variant === 'guestIntro') onContinueAsGuest()
    else onFinish()
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
            {/* 'account'-only copy ("Your account is ready") would be flatly
                wrong for guestIntro, shown before any account exists — and
                the dataNote below (about local data NOT moving into an
                account automatically) is the opposite of guestIntro's whole
                point, so it's skipped there entirely rather than reworded. */}
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
              {t(variant === 'guestIntro' ? 'accountSetup.welcomeGuest.title' : 'accountSetup.welcome.title')}
            </h1>
            <p className="font-sans text-sage text-sm leading-relaxed max-w-sm">
              {t(variant === 'guestIntro' ? 'accountSetup.welcomeGuest.body' : 'accountSetup.welcome.body')}
            </p>
            {variant !== 'guestIntro' && (
              // A brief, calm note, not a warning callout — no border/background
              // box, just a smaller/muted line under the main body copy.
              <p className="font-sans text-sage text-xs leading-relaxed max-w-sm">
                {t('accountSetup.welcome.dataNote')}
              </p>
            )}
          </div>
        )}

        {step === 'experienceMode' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.experienceMode.title')}
            </h1>
            <p className="font-sans text-sage text-sm leading-relaxed max-w-sm">
              {t('accountSetup.experienceMode.body')}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm mt-1">
              {['simple', 'full'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectExperienceMode(option)}
                  aria-pressed={experienceMode === option}
                  className={
                    'flex flex-col items-start gap-0.5 text-left px-4 py-3 rounded-xl border transition-colors ' +
                    (experienceMode === option
                      ? 'border-tomato bg-tomato/10 text-cream'
                      : 'border-cream/15 text-sage hover:text-cream')
                  }
                >
                  <span className="font-sans font-semibold text-sm">
                    {t(`accountSetup.experienceMode.${option}Label`)}
                  </span>
                  <span className="font-sans text-xs opacity-80">
                    {t(`accountSetup.experienceMode.${option}Hint`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'language' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
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
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
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
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.theme.title')}
            </h1>
            <div className="flex flex-wrap justify-center gap-2">
              <ThemePicker value={theme} onSelect={onSelectTheme} />
            </div>
          </div>
        )}

        {step === 'goal' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
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

        {/* guestIntro-only closing pitch — the pick made on every earlier
            step already lives in real settings (patchSettings on every
            keystroke, same as the rest of this wizard), so "Create free
            account" only has to open sign-up; App.jsx's own onRequestSignUp
            handles capturing/transferring those choices onto the new
            account once it actually exists. */}
        {isSignupStep && (
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-warm text-cream font-bold text-lg tracking-wide">
              {t('accountSetup.signup.title')}
            </h1>
            <p className="font-sans text-sage text-sm leading-relaxed max-w-sm">{t('accountSetup.signup.body')}</p>
            <div className="flex flex-col items-center gap-2 w-full mt-2">
              <button
                type="button"
                onClick={onRequestSignUp}
                className="font-sans text-sm px-6 py-2 rounded-xl bg-tomato text-on-tomato font-semibold"
              >
                {t('accountSetup.signup.createAccountButton')}
              </button>
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="font-sans text-xs text-sage hover:text-cream"
              >
                {t('accountSetup.signup.continueLocallyButton')}
              </button>
            </div>
          </div>
        )}

        {/* Three deliberately distinct tiers, so "skip this one field" and
            "exit the whole wizard" can never be confused for each other:
            Continue/Finish (primary, filled) > "Skip this step" (secondary,
            plain sage text, sits right under Continue) > "Skip setup
            entirely" (tertiary, smaller and more muted, underlined — the
            same de-emphasized-exit-link style already used elsewhere in the
            app). Skipping a step functionally advances the same way
            Continue does (nothing gets "set" on a step you never touched
            either way) — the two labels exist for clarity of intent, not
            because they do different things under the hood.
            On the guestIntro 'signup' step, this whole block is replaced by
            that step's own two explicit buttons (above) — a generic
            "Continue"/"Skip" pair would be meaningless there, since the
            step *is* the decision. Only Back stays, so a guest can still
            return to adjust an earlier pick before choosing. */}
        {!isSignupStep && (
          <div className="flex flex-col items-center gap-2 w-full mt-2">
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
                className="font-sans text-sm px-6 py-2 rounded-xl bg-tomato text-on-tomato font-semibold"
              >
                {isLastStep ? t('accountSetup.finishButton') : t('accountSetup.continueButton')}
              </button>
            </div>
            <button type="button" onClick={goNext} className="font-sans text-xs text-sage hover:text-cream">
              {t('accountSetup.skipStepButton')}
            </button>
            <button
              type="button"
              onClick={handleSkipEntirely}
              className="font-sans text-[11px] text-sage hover:text-cream underline decoration-dotted mt-1"
            >
              {t('accountSetup.skipButton')}
            </button>
          </div>
        )}
        {isSignupStep && stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i - 1)}
            className="font-sans text-sm px-4 py-2 rounded-xl border border-cream/20 text-cream mt-2"
          >
            {t('accountSetup.backButton')}
          </button>
        )}
      </div>
    </div>
  )
}

export default AccountSetupFlow
