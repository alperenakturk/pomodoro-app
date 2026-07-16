import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Reports from './Reports'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'
import { saveTicks, saveActivityLog } from '../lib/storage'

function renderReports(props) {
  return render(
    <LanguageProvider>
      <Reports coachMarksSuppressed {...props} />
    </LanguageProvider>
  )
}

const today = new Date().toISOString().slice(0, 10)

function seedTicks(overrides = []) {
  saveTicks([
    { id: 't1', type: 'pomodoro', date: today },
    { id: 't2', type: 'pomodoro', date: today },
    { id: 't3', type: 'pause', date: today },
    ...overrides,
  ])
}

function seedActivityLog(overrides = []) {
  saveActivityLog([
    {
      id: 'r1',
      date: today,
      activity: 'Write report',
      estimate: 3,
      real: 4,
      diff: 1,
      internal: 1,
      external: 0,
      categoryIds: [],
    },
    ...overrides,
  ])
}

beforeEach(() => {
  localStorage.clear()
})

describe('Reports', () => {
  it('shows the "no data at all" empty state with empty storage', () => {
    renderReports()
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Estimation Accuracy/ })).not.toBeInTheDocument()
  })

  it('renders the launcher menu with all six report cards, each showing a computed teaser value', () => {
    seedTicks()
    seedActivityLog()
    renderReports()

    // Every card is a single button whose accessible name concatenates its
    // label + value + caption — toHaveTextContent scopes the value check to
    // that one card instead of a page-wide (and possibly ambiguous) text match.
    expect(screen.getByRole('button', { name: /Today's Summary/ })).toHaveTextContent('0:50')
    expect(screen.getByRole('button', { name: /Estimation Accuracy/ })).toHaveTextContent('1.0')
    expect(screen.getByRole('button', { name: /Interruption Trends/ })).toHaveTextContent('1.0')
    expect(screen.getByRole('button', { name: /Pomodoros by Category/ })).toHaveTextContent('4 pom.')
    expect(screen.getByRole('button', { name: /Long-Term Heatmap/ })).toHaveTextContent('2')
    // No detail heading or breadcrumb until a card is clicked.
    expect(screen.queryByRole('heading', { name: 'Estimation Accuracy' })).not.toBeInTheDocument()
  })

  it('opens a full-page detail view on card click, hiding the menu and every other section', () => {
    seedTicks()
    seedActivityLog()
    renderReports()

    fireEvent.click(screen.getByRole('button', { name: /Pomodoros by Category/ }))

    expect(screen.getByRole('heading', { name: 'Pomodoros by Category' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Estimation Accuracy/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: "Today's Summary" })).not.toBeInTheDocument()
  })

  it('returns to the menu via the breadcrumb button', () => {
    seedTicks()
    seedActivityLog()
    renderReports()

    fireEvent.click(screen.getByRole('button', { name: /Pomodoros by Category/ }))
    expect(screen.getByRole('heading', { name: 'Pomodoros by Category' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Reports/ }))
    expect(screen.queryByRole('heading', { name: 'Pomodoros by Category' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Estimation Accuracy/ })).toBeInTheDocument()
  })

  it('pages to the adjacent section with Previous/Next without passing back through the menu', () => {
    seedTicks()
    seedActivityLog()
    renderReports()

    fireEvent.click(screen.getByRole('button', { name: /Today's Summary/ }))
    expect(screen.getByRole('heading', { name: "Today's Summary" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Previous' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next →' }))
    expect(screen.getByRole('heading', { name: 'Estimation Accuracy' })).toBeInTheDocument()
    // Still in a detail view, not the menu.
    expect(screen.queryByRole('button', { name: /Today's Summary/ })).not.toBeInTheDocument()
  })

  it('updates the launcher teaser when a period pill is clicked', () => {
    seedTicks()
    seedActivityLog()
    renderReports()

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
  })
})
