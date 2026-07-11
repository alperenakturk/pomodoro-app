import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChangePasswordModal from './ChangePasswordModal'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

const mockUpdatePassword = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ updatePassword: mockUpdatePassword }),
}))

function renderModal(onClose = vi.fn()) {
  return render(
    <LanguageProvider>
      <ChangePasswordModal onClose={onClose} />
    </LanguageProvider>
  )
}

function fillAndSubmit(password, confirmPassword) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirmPassword } })
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }))
}

beforeEach(() => {
  mockUpdatePassword.mockReset()
})

describe('ChangePasswordModal', () => {
  it('rejects submission when the two passwords do not match, without calling updatePassword', async () => {
    renderModal()
    fillAndSubmit('secret123', 'different123')

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('calls updatePassword and shows a success message when the passwords match', async () => {
    mockUpdatePassword.mockResolvedValue({ error: null })
    renderModal()
    fillAndSubmit('secret123', 'secret123')

    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument()
    expect(mockUpdatePassword).toHaveBeenCalledWith('secret123')
  })

  it('shows the error message from updatePassword on failure, without a success state', async () => {
    mockUpdatePassword.mockResolvedValue({ error: { message: 'Password too weak' } })
    renderModal()
    fillAndSubmit('secret123', 'secret123')

    expect(await screen.findByText('Password too weak')).toBeInTheDocument()
    expect(screen.queryByText('Your password has been changed.')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    renderModal(onClose)
    fireEvent.click(screen.getByRole('button', { name: 'close change password dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
