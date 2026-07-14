import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryManager from './CategoryManager'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'

const CATEGORIES = [{ id: 'c1', name: 'Work', color: '#5b7290' }]

function renderManager(props) {
  return render(
    <LanguageProvider>
      <CategoryManager
        categories={CATEGORIES}
        addCategory={vi.fn()}
        updateCategory={vi.fn()}
        removeCategory={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  )
}

describe('CategoryManager', () => {
  it('shows the add-category form by default (signed-in behavior)', () => {
    renderManager()
    expect(screen.getByPlaceholderText('New category...')).toBeInTheDocument()
  })

  // Deliberate product decision, not a bug fix: guests keep full use of
  // existing categories but can't create new ones — see CategoryManager.jsx.
  it('replaces the add-category form with a sign-up prompt when canCreateCategories is false', () => {
    renderManager({ canCreateCategories: false })
    expect(screen.queryByPlaceholderText('New category...')).not.toBeInTheDocument()
    expect(
      screen.getByText('Creating new categories requires a free account. You can still use, edit, and delete your existing ones.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('calls onRequireSignIn when the guest-gate "Sign up" button is clicked', () => {
    const onRequireSignIn = vi.fn()
    renderManager({ canCreateCategories: false, onRequireSignIn })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(onRequireSignIn).toHaveBeenCalledTimes(1)
  })

  it('still lists existing categories, editable and deletable, when canCreateCategories is false', () => {
    renderManager({ canCreateCategories: false })
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'edit Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'delete Work' })).toBeInTheDocument()
  })

  it('editing an existing category still works when canCreateCategories is false', () => {
    const updateCategory = vi.fn()
    renderManager({ canCreateCategories: false, updateCategory })
    fireEvent.click(screen.getByRole('button', { name: 'edit Work' }))
    const input = screen.getByLabelText('Category name')
    fireEvent.change(input, { target: { value: 'Deep Work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(updateCategory).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Deep Work' }))
  })
})
