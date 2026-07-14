import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RichText from './RichText'

describe('RichText', () => {
  it('renders a plain paragraph body as-is', () => {
    render(<RichText text="Just a sentence." />)
    expect(screen.getByText('Just a sentence.')).toBeInTheDocument()
  })

  it('renders a "## " block as a heading and "- " lines as a real list', () => {
    render(<RichText text={'Intro.\n\n## A heading\n\n- First point.\n- Second point.'} />)
    expect(screen.getByText('Intro.')).toBeInTheDocument()
    expect(screen.getByText('A heading')).toBeInTheDocument()
    const list = screen.getByRole('list')
    expect(list).toBeInTheDocument()
    expect(screen.getByText('First point.').tagName).toBe('LI')
    expect(screen.getByText('Second point.').tagName).toBe('LI')
  })
})
