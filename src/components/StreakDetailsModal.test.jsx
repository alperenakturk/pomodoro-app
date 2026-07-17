import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StreakDetailsModal from './StreakDetailsModal'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

function renderModal(props) {
  return render(
    <LanguageProvider>
      <StreakDetailsModal
        currentStreak={3}
        longestStreak={5}
        freezeAvailable={false}
        daysUntilNextFreeze={2}
        nextMilestone={7}
        recentDays={[
          { date: '2026-01-01', status: 'done' },
          { date: '2026-01-02', status: 'frozen' },
          { date: '2026-01-03', status: 'missed' },
        ]}
        onClose={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  )
}

describe('StreakDetailsModal', () => {
  it('shows the current streak as the hero stat and the longest streak as a secondary stat', () => {
    renderModal({ currentStreak: 3, longestStreak: 5 })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3 day streak')).toBeInTheDocument()
    expect(screen.getByText('Longest: 5 days')).toBeInTheDocument()
  })

  it('shows Streak Freeze ready when available', () => {
    renderModal({ freezeAvailable: true })
    expect(screen.getByText('Streak Freeze ready')).toBeInTheDocument()
  })

  it('shows days-until-next-freeze when not available', () => {
    renderModal({ freezeAvailable: false, daysUntilNextFreeze: 4 })
    expect(screen.getByText('Next Streak Freeze in 4 days')).toBeInTheDocument()
  })

  it('shows the next milestone distance', () => {
    renderModal({ currentStreak: 3, nextMilestone: 7 })
    expect(screen.getByText('4 days to the 7-day milestone')).toBeInTheDocument()
  })

  it('shows the all-milestones-reached message when there is no next milestone', () => {
    renderModal({ nextMilestone: null })
    expect(screen.getByText("You've passed every milestone — impressive!")).toBeInTheDocument()
  })

  it('shows a color legend for the recent-days strip', () => {
    renderModal()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Frozen')).toBeInTheDocument()
    expect(screen.getByText('Missed')).toBeInTheDocument()
  })

  it('renders one dot per recent day', () => {
    const { container } = renderModal({
      recentDays: [
        { date: '2026-01-01', status: 'done' },
        { date: '2026-01-02', status: 'frozen' },
        { date: '2026-01-03', status: 'missed' },
        { date: '2026-01-04', status: 'pending' },
      ],
    })
    expect(container.querySelectorAll('[role="img"] > span')).toHaveLength(4)
  })

  it('closing via the × button calls onClose', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Close streak details' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closing via the backdrop calls onClose, but clicking inside the dialog does not', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog').parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus to the close button on mount', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Close streak details' })).toHaveFocus()
  })
})
