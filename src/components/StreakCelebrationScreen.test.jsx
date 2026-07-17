import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StreakCelebrationScreen from './StreakCelebrationScreen'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

// jsdom does not implement window.matchMedia at all (confirmed: it's
// `undefined`, not a stub) — set/restore it per test rather than adding a
// blanket polyfill to the global test setup, so only the tests that
// actually care about prefers-reduced-motion touch it.
function setReducedMotion(matches) {
  window.matchMedia = vi.fn().mockReturnValue({ matches })
}

afterEach(() => {
  delete window.matchMedia
})

function renderScreen(props) {
  return render(
    <LanguageProvider>
      <StreakCelebrationScreen celebration="increment" streak={5} onDone={vi.fn()} {...props} />
    </LanguageProvider>
  )
}

describe('StreakCelebrationScreen', () => {
  it('renders nothing when there is no celebration', () => {
    const { container } = renderScreen({ celebration: null })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the full-screen takeover with the current streak count on a plain increment', () => {
    renderScreen({ celebration: 'increment', streak: 5 })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('5-Day Streak!')).toBeInTheDocument()
    expect(screen.getByText('Keep the fire going.')).toBeInTheDocument()
    // Milestone-only badge must not appear for a plain increment.
    expect(screen.queryByText('Milestone')).not.toBeInTheDocument()
  })

  it('shows the milestone badge and a distinct subtitle on a milestone', () => {
    renderScreen({ celebration: 'milestone', streak: 7 })
    expect(screen.getByText('Milestone')).toBeInTheDocument()
    expect(screen.getByText('7-Day Streak!')).toBeInTheDocument()
    expect(screen.getByText("You've hit a new milestone!")).toBeInTheDocument()
  })

  it('clicking Continue calls onDone', () => {
    const onDone = vi.fn()
    renderScreen({ onDone })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('pressing Escape dismisses via onDone', () => {
    const onDone = vi.fn()
    renderScreen({ onDone })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('pressing Enter also dismisses via onDone', () => {
    const onDone = vi.fn()
    renderScreen({ onDone })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('moves focus to the Continue button on mount', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
  })

  it('still shows full content under prefers-reduced-motion, without applying any animation classes', () => {
    setReducedMotion(true)
    const { container } = renderScreen({ celebration: 'milestone', streak: 7 })

    // The screen itself, the streak count, and the Continue button are all
    // still real information — reduced motion means no animated entrance,
    // not "hide everything" (unlike the old, purely-decorative corner
    // version this component replaced).
    expect(screen.getByText('7-Day Streak!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(container.querySelector('.animate-streak-explode')).toBeNull()
    expect(container.querySelector('.animate-streak-particle')).toBeNull()
    expect(container.querySelector('.animate-streak-glow-pulse')).toBeNull()
    expect(container.querySelector('.animate-tomato-mascot-splat')).toBeNull()
    expect(container.querySelector('.animate-tomato-splat-blob')).toBeNull()
    expect(container.querySelector('.animate-tomato-drip')).toBeNull()
    expect(container.querySelector('.animate-tomato-splat-flash')).toBeNull()
  })

  it('a plain increment gets the mascot burst + particle ring (the old milestone-only treatment)', () => {
    const { container } = renderScreen({ celebration: 'increment', streak: 5 })
    expect(container.querySelector('.animate-streak-explode')).not.toBeNull()
    expect(container.querySelectorAll('.animate-streak-particle').length).toBeGreaterThan(0)
    // The milestone-only splat effect must never appear on a plain day.
    expect(container.querySelector('.animate-tomato-mascot-splat')).toBeNull()
    expect(container.querySelectorAll('.animate-tomato-splat-blob').length).toBe(0)
  })

  it('a milestone gets the tomato-splat mascot animation, a full burst of sauce blobs, and drips — not the plain increment burst', () => {
    const { container } = renderScreen({ celebration: 'milestone', streak: 7 })
    expect(container.querySelector('.animate-tomato-mascot-splat')).not.toBeNull()
    expect(container.querySelectorAll('.animate-tomato-splat-blob').length).toBe(22)
    expect(container.querySelectorAll('.animate-tomato-drip').length).toBe(6)
    expect(container.querySelector('.animate-tomato-splat-flash')).not.toBeNull()
    // Not the increment-tier burst.
    expect(container.querySelector('.animate-streak-explode')).toBeNull()
    expect(container.querySelectorAll('.animate-streak-particle').length).toBe(0)
  })

  it('regenerates a fresh splat pattern each time a milestone fires, without depending on the specific streak count', () => {
    const { container, rerender } = render(
      <LanguageProvider>
        <StreakCelebrationScreen celebration="milestone" streak={7} onDone={vi.fn()} />
      </LanguageProvider>
    )
    const firstAngles = Array.from(container.querySelectorAll('.animate-tomato-splat-blob')).map(
      (el) => el.style.getPropertyValue('--angle')
    )

    // Cycle through null (as the real celebration lifecycle always does
    // between two separate milestones via clearCelebration) before the next
    // milestone, then fire a new one.
    rerender(
      <LanguageProvider>
        <StreakCelebrationScreen celebration={null} streak={7} onDone={vi.fn()} />
      </LanguageProvider>
    )
    rerender(
      <LanguageProvider>
        <StreakCelebrationScreen celebration="milestone" streak={14} onDone={vi.fn()} />
      </LanguageProvider>
    )
    const secondAngles = Array.from(container.querySelectorAll('.animate-tomato-splat-blob')).map(
      (el) => el.style.getPropertyValue('--angle')
    )

    expect(secondAngles).toHaveLength(22)
    expect(secondAngles).not.toEqual(firstAngles)
  })
})
