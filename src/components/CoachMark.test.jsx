import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CoachMark from './CoachMark'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

function renderCoachMark(props) {
  return render(
    <LanguageProvider>
      <CoachMark
        titleKey="coachMarks.timerIntro.title"
        bodyKey="coachMarks.timerIntro.body"
        onDismiss={vi.fn()}
        onLearnMore={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  )
}

describe('CoachMark', () => {
  it('renders its title/body — visibility is entirely up to the caller (no seen/hidden state of its own)', () => {
    renderCoachMark()
    expect(screen.getByText('Welcome — here’s the idea')).toBeInTheDocument()
  })

  it('calls onDismiss when "Got it" or the × button is clicked', () => {
    const onDismiss = vi.fn()
    renderCoachMark({ onDismiss })
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onLearnMore, not onDismiss, when "Learn more" is clicked', () => {
    const onDismiss = vi.fn()
    const onLearnMore = vi.fn()
    renderCoachMark({ onDismiss, onLearnMore })
    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }))
    expect(onLearnMore).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
