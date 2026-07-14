import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GuestSignupNudge from './GuestSignupNudge'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

function renderNudge(props) {
  return render(
    <LanguageProvider>
      <GuestSignupNudge onDismiss={vi.fn()} onSignUp={vi.fn()} {...props} />
    </LanguageProvider>
  )
}

describe('GuestSignupNudge', () => {
  it('renders the title and benefit list', () => {
    renderNudge()
    expect(screen.getByText('Get more with an account')).toBeInTheDocument()
    expect(screen.getByText(/Sync your tasks and history/)).toBeInTheDocument()
  })

  it('calls onDismiss when the × button is clicked', () => {
    const onDismiss = vi.fn()
    renderNudge({ onDismiss })
    fireEvent.click(screen.getByRole('button', { name: 'dismiss account nudge' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onSignUp, not onDismiss, when "Sign up" is clicked', () => {
    const onDismiss = vi.fn()
    const onSignUp = vi.fn()
    renderNudge({ onDismiss, onSignUp })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(onSignUp).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
