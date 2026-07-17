import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AccountSetupFlow from './AccountSetupFlow'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

function renderFlow(props) {
  return render(
    <LanguageProvider>
      <AccountSetupFlow
        onFinish={vi.fn()}
        displayName=""
        setDisplayName={vi.fn()}
        theme="dark"
        onSelectTheme={vi.fn()}
        dailyPomodoroGoal={null}
        setDailyPomodoroGoal={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  )
}

describe('AccountSetupFlow', () => {
  it('starts on the welcome step', () => {
    renderFlow()
    expect(screen.getByText('Your account is ready')).toBeInTheDocument()
  })

  it('advances through every step via Continue, ending on the goal step with a Finish button', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // welcome -> language
    expect(screen.getByText('Choose your language')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // language -> name
    expect(screen.getByText('What should we call you?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // name -> theme
    expect(screen.getByText('Pick a look')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // theme -> goal
    expect(screen.getByText('Set a daily Pomodoro goal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
  })

  it('never blocks Continue on an empty field', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    // Now on the name step with an empty displayName — Continue must still work.
    expect(screen.getByText('What should we call you?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Pick a look')).toBeInTheDocument()
  })

  it('calls onFinish immediately when "Skip setup entirely" is clicked, from any step', () => {
    const onFinish = vi.fn()
    renderFlow({ onFinish })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // welcome -> language
    fireEvent.click(screen.getByRole('button', { name: 'Skip setup entirely' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('"Skip this step" advances to the next step without exiting the whole flow', () => {
    const onFinish = vi.fn()
    renderFlow({ onFinish })
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // welcome -> language
    expect(screen.getByText('Choose your language')).toBeInTheDocument()
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('"Skip this step" and "Skip setup entirely" are both present and distinct on every step', () => {
    renderFlow()
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip setup entirely' })).toBeInTheDocument()
  })

  it('shows a note on the welcome step that local data is not moved automatically', () => {
    renderFlow()
    expect(
      screen.getByText(/local data.*guest.*isn't moved into this account automatically/i)
    ).toBeInTheDocument()
  })

  it('calls setDisplayName as the name field is typed', () => {
    const setDisplayName = vi.fn()
    renderFlow({ setDisplayName })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. Alex'), { target: { value: 'Alperen' } })
    expect(setDisplayName).toHaveBeenCalledWith('Alperen')
  })

  it('calls onSelectTheme when a theme swatch is clicked, for a live preview', () => {
    const onSelectTheme = vi.fn()
    renderFlow({ onSelectTheme })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Light Sage' }))
    expect(onSelectTheme).toHaveBeenCalledWith('light-sage')
  })

  function goToGoalStep() {
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  }

  it('parses a typed goal as a number', () => {
    const setDailyPomodoroGoal = vi.fn()
    renderFlow({ setDailyPomodoroGoal })
    goToGoalStep()
    fireEvent.change(screen.getByPlaceholderText('e.g. 8'), { target: { value: '6' } })
    expect(setDailyPomodoroGoal).toHaveBeenCalledWith(6)
  })

  it('parses a cleared goal field as null, not an empty string', () => {
    const setDailyPomodoroGoal = vi.fn()
    renderFlow({ setDailyPomodoroGoal, dailyPomodoroGoal: 5 })
    goToGoalStep()
    fireEvent.change(screen.getByPlaceholderText('e.g. 8'), { target: { value: '' } })
    expect(setDailyPomodoroGoal).toHaveBeenCalledWith(null)
  })

  it('Finish calls onFinish', () => {
    const onFinish = vi.fn()
    renderFlow({ onFinish })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('Back returns to the previous step', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // -> language
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })) // -> name
    fireEvent.click(screen.getByRole('button', { name: 'Back' })) // -> language
    expect(screen.getByText('Choose your language')).toBeInTheDocument()
  })
})

describe("AccountSetupFlow 'guestIntro' variant", () => {
  function renderGuestIntro(props) {
    return render(
      <LanguageProvider>
        <AccountSetupFlow
          variant="guestIntro"
          onContinueAsGuest={vi.fn()}
          onRequestSignUp={vi.fn()}
          displayName=""
          setDisplayName={vi.fn()}
          theme="dark"
          onSelectTheme={vi.fn()}
          dailyPomodoroGoal={null}
          setDailyPomodoroGoal={vi.fn()}
          {...props}
        />
      </LanguageProvider>
    )
  }

  function goToSignupStep() {
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // welcome -> language
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> name
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> theme
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> goal
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> signup
  }

  it('starts on a welcome step with guest-appropriate copy, not "Your account is ready"', () => {
    renderGuestIntro()
    expect(screen.getByText('Where should we start?')).toBeInTheDocument()
    expect(screen.queryByText('Your account is ready')).not.toBeInTheDocument()
    // The "local data isn't moved automatically" note only makes sense once
    // an account already exists — must not show here.
    expect(screen.queryByText(/isn't moved into this account automatically/i)).not.toBeInTheDocument()
  })

  it('appends one more step (signup) after goal, reachable via the normal step flow', () => {
    renderGuestIntro()
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument()
    goToSignupStep()
    expect(screen.getByText('Step 6 of 6')).toBeInTheDocument()
    expect(screen.getByText('Create a free account to unlock more')).toBeInTheDocument()
  })

  it('the signup step has no generic Continue/Skip-this-step controls, only its own two buttons', () => {
    renderGuestIntro()
    goToSignupStep()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip setup entirely' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create free account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with local storage' })).toBeInTheDocument()
  })

  it('clicking "Create free account" calls onRequestSignUp, not onFinish/onContinueAsGuest', () => {
    const onRequestSignUp = vi.fn()
    const onContinueAsGuest = vi.fn()
    renderGuestIntro({ onRequestSignUp, onContinueAsGuest })
    goToSignupStep()
    fireEvent.click(screen.getByRole('button', { name: 'Create free account' }))
    expect(onRequestSignUp).toHaveBeenCalledTimes(1)
    expect(onContinueAsGuest).not.toHaveBeenCalled()
  })

  it('clicking "Continue with local storage" calls onContinueAsGuest', () => {
    const onContinueAsGuest = vi.fn()
    renderGuestIntro({ onContinueAsGuest })
    goToSignupStep()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with local storage' }))
    expect(onContinueAsGuest).toHaveBeenCalledTimes(1)
  })

  it('"Skip setup entirely" from an earlier step also calls onContinueAsGuest, not onFinish', () => {
    const onContinueAsGuest = vi.fn()
    renderGuestIntro({ onContinueAsGuest })
    fireEvent.click(screen.getByRole('button', { name: 'Skip setup entirely' }))
    expect(onContinueAsGuest).toHaveBeenCalledTimes(1)
  })

  it('every earlier step still commits live via the same setters as the account variant', () => {
    const setDisplayName = vi.fn()
    const onSelectTheme = vi.fn()
    renderGuestIntro({ setDisplayName, onSelectTheme })
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> language
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> name
    fireEvent.change(screen.getByPlaceholderText('e.g. Alex'), { target: { value: 'Deniz' } })
    expect(setDisplayName).toHaveBeenCalledWith('Deniz')
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' })) // -> theme
    fireEvent.click(screen.getByRole('button', { name: 'Light Sand' }))
    expect(onSelectTheme).toHaveBeenCalledWith('light-sand')
  })
})
