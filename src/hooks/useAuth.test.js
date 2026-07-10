import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { AuthProvider } from '../lib/auth/AuthContext'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signInWithOAuth: (...args) => mockSignInWithOAuth(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signUp: (...args) => mockSignUp(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}))

function renderWithProvider() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
  })

  it('starts loading, then resolves to a guest (user: null) session', async () => {
    const { result } = renderWithProvider()
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('picks up an already-signed-in session on mount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@b.com' } } } })
    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('signInWithGoogle passes a redirectTo built from the current origin + BASE_URL', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signInWithGoogle()
    })

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining(window.location.origin) },
    })
  })

  it('signInWithEmail delegates to supabase.auth.signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signInWithEmail('a@b.com', 'secret123')
    })

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' })
  })

  it('signUpWithEmail delegates to supabase.auth.signUp', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null })
    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUpWithEmail('a@b.com', 'secret123')
    })

    expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' })
  })

  it('signOut delegates to supabase.auth.signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})
