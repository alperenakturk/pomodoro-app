import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsModal from './SettingsModal'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

// Change Password must only be reachable for accounts that actually have a
// password to change — a Google-only account has no email/password identity
// linked, so hasPasswordProvider() (SettingsModal.jsx) must gate it off.
// This can't be exercised end-to-end against a real Google-linked Supabase
// session (no way to script Google's own OAuth consent screen), so it's
// verified here instead by mocking useAuth() with the two `identities`
// shapes Supabase actually returns for each case.
let mockAuthValue = { user: null, deleteAccount: vi.fn() }
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockAuthValue,
}))

const baseProps = {
  onClose: vi.fn(),
  cycleLength: 4,
  setCycleLength: vi.fn(),
  resetCycleLength: vi.fn(),
  workMinutes: 25,
  setWorkMinutes: vi.fn(),
  shortBreakMinutes: 5,
  setShortBreakMinutes: vi.fn(),
  longBreakMinutes: 15,
  setLongBreakMinutes: vi.fn(),
  autoStartBreaks: false,
  setAutoStartBreaks: vi.fn(),
  autoStartPomodoros: false,
  setAutoStartPomodoros: vi.fn(),
  chimeStyle: 'classic',
  setChimeStyle: vi.fn(),
  soundVolume: 100,
  setSoundVolume: vi.fn(),
  ambientSound: 'none',
  setAmbientSound: vi.fn(),
  checkToBottom: false,
  setCheckToBottom: vi.fn(),
  theme: 'dark',
  onSelectTheme: vi.fn(),
  categories: [],
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  removeCategory: vi.fn(),
}

function renderSettings() {
  return render(
    <LanguageProvider>
      <SettingsModal {...baseProps} />
    </LanguageProvider>
  )
}

function openAccountCategory() {
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
}

describe('SettingsModal Account category', () => {
  it('hides Change Password for a Google-only account', () => {
    mockAuthValue = {
      user: {
        email: 'googleuser@example.com',
        identities: [{ provider: 'google' }],
      },
      deleteAccount: vi.fn(),
    }
    renderSettings()
    openAccountCategory()

    expect(screen.getByText(/googleuser@example\.com/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change Password' })).not.toBeInTheDocument()
    // Delete Account isn't gated by password provider — any signed-in user
    // (Google or email) can still delete their account.
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeInTheDocument()
  })

  it('shows Change Password for an email/password account', () => {
    mockAuthValue = {
      user: {
        email: 'emailuser@example.com',
        identities: [{ provider: 'email' }],
      },
      deleteAccount: vi.fn(),
    }
    renderSettings()
    openAccountCategory()

    expect(screen.getByText(/emailuser@example\.com/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
  })

  it('shows Change Password for an account linked to both Google and email', () => {
    mockAuthValue = {
      user: {
        email: 'both@example.com',
        identities: [{ provider: 'google' }, { provider: 'email' }],
      },
      deleteAccount: vi.fn(),
    }
    renderSettings()
    openAccountCategory()

    expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
  })

  it('shows a Sign in prompt for guests instead of account controls', () => {
    mockAuthValue = { user: null, deleteAccount: vi.fn() }
    renderSettings()
    openAccountCategory()

    expect(screen.getByText('Not signed in')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change Password' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Account' })).not.toBeInTheDocument()
  })
})
