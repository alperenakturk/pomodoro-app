import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DatedTaskGroup from './DatedTaskGroup'
import { LanguageProvider } from '../lib/i18n/LanguageContext'

function renderGroup(props) {
  return render(
    <LanguageProvider>
      <DatedTaskGroup titleKey="today.carriedTitle" kind="carried" {...props} />
    </LanguageProvider>
  )
}

const task = { id: 't1', text: 'Leftover task', date: '2026-06-09' }

describe('DatedTaskGroup', () => {
  it('still shows its title and an empty-state line when there are no tasks', () => {
    renderGroup({
      emptyKey: 'today.carriedEmpty',
      tasks: [],
      onMoveToToday: vi.fn(),
      onPostpone: vi.fn(),
      onRemove: vi.fn(),
    })
    expect(screen.getByText('Left over from earlier days (0)')).toBeTruthy()
    expect(screen.getByText('Nothing left over from earlier days.')).toBeTruthy()
  })

  it('"move to today" and "delete" call back with the task id', () => {
    const onMoveToToday = vi.fn()
    const onRemove = vi.fn()
    renderGroup({ tasks: [task], onMoveToToday, onPostpone: vi.fn(), onRemove })

    fireEvent.click(screen.getByText('Move to today'))
    fireEvent.click(screen.getByText('Delete'))

    expect(onMoveToToday).toHaveBeenCalledWith('t1')
    expect(onRemove).toHaveBeenCalledWith('t1')
  })

  it('postpone stays disabled until a date is picked, then passes the date', () => {
    const onPostpone = vi.fn()
    renderGroup({ tasks: [task], onMoveToToday: vi.fn(), onPostpone, onRemove: vi.fn() })

    const button = screen.getByText('Postpone')
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Postpone this task to a later date'), { target: { value: '2099-01-02' } })
    expect(button.disabled).toBe(false)
    fireEvent.click(button)

    expect(onPostpone).toHaveBeenCalledWith('t1', '2099-01-02')
  })

  it('later tasks offer no postpone control', () => {
    renderGroup({ kind: 'later', tasks: [task], onMoveToToday: vi.fn(), onPostpone: vi.fn(), onRemove: vi.fn() })
    expect(screen.queryByText('Postpone')).toBeNull()
  })
})
