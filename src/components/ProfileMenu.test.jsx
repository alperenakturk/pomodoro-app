import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProfileMenu from './ProfileMenu'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

// Live Supabase E2E coverage for the signed-in dropdown wasn't possible this
// session (project-side signup rate limit — see chat), so this verifies the
// dropdown's own logic directly: mocking useAuth is enough since ProfileMenu
// never touches storage.js or the network itself.
const mockSignOut = vi.fn()
let mockUser = null
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: false, signOut: mockSignOut }),
}))

function renderMenu() {
  return render(
    <LanguageProvider>
      <ProfileMenu />
    </LanguageProvider>
  )
}

beforeEach(() => {
  mockUser = null
  mockSignOut.mockClear()
  vi.spyOn(window, 'confirm')
})

describe('ProfileMenu', () => {
  it('shows a Sign in button for guests', () => {
    renderMenu()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows an avatar with the email initial when signed in, and opens a dropdown with Sign out', () => {
    mockUser = { id: 'user-1', email: 'ada@example.com' }
    renderMenu()

    const avatar = screen.getByRole('button', { name: 'Account menu' })
    expect(avatar).toHaveTextContent('A')

    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument()
    fireEvent.click(avatar)
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('signs out only after confirming, and closes the menu either way', () => {
    mockUser = { id: 'user-1', email: 'ada@example.com' }
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))

    window.confirm.mockReturnValue(false)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    window.confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('closes the dropdown on outside click', () => {
    mockUser = { id: 'user-1', email: 'ada@example.com' }
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument()
  })
})
