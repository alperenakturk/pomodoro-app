import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TodoToday from './TodoToday'
import { LanguageProvider } from '../lib/i18n/LanguageContext'

const baseTask = {
  id: 't1',
  text: 'Write report',
  estimate: 2,
  realized: 0,
  internal: 0,
  external: 0,
  categoryIds: [],
  notes: '',
  unplanned: false,
  urgent: false,
  done: false,
  date: '2026-06-10',
}

function renderTodo(overrides = {}) {
  const props = {
    tasks: [],
    carriedTasks: [],
    laterTasks: [],
    moveTaskToDate: vi.fn(),
    activeTaskId: null,
    setActiveTaskId: vi.fn(),
    addTask: vi.fn(),
    removeTask: vi.fn(),
    clearFinishedTasks: vi.fn(),
    clearAllTasks: vi.fn(),
    updateTask: vi.fn(),
    reestimateTask: vi.fn(),
    finishTask: vi.fn(),
    categories: [],
    onManageCategories: vi.fn(),
    ...overrides,
  }
  render(
    <LanguageProvider>
      <TodoToday {...props} />
    </LanguageProvider>
  )
  return props
}

describe('TodoToday layout', () => {
  it('always shows the three day sections, with empty states, even with no tasks at all', () => {
    renderTodo()
    expect(screen.getByText("Today's tasks (0)")).toBeTruthy()
    expect(screen.getByText('Left over from earlier days (0)')).toBeTruthy()
    expect(screen.getByText('Nothing left over from earlier days.')).toBeTruthy()
    expect(screen.getByText('Postponed or planned ahead (0)')).toBeTruthy()
    expect(screen.getByText('Nothing scheduled for later days.')).toBeTruthy()
  })

  it('keeps Unplanned & Urgent as its own collapsible card, closed while empty', () => {
    renderTodo()
    const toggle = screen.getByRole('button', { name: /Unplanned/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it("lets a task on today's list be moved to another day", () => {
    const props = renderTodo({ tasks: [baseTask] })

    fireEvent.click(screen.getByLabelText('Move this task to another day'))
    fireEvent.change(screen.getByLabelText('Postpone this task to a later date'), { target: { value: '2099-03-04' } })
    fireEvent.click(screen.getByText('Postpone'))

    expect(props.moveTaskToDate).toHaveBeenCalledWith('t1', '2099-03-04')
  })

  it('adding with a chosen date passes it to addTask', () => {
    const props = renderTodo()
    fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Dentist' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-01-02' } })
    fireEvent.click(screen.getByText('Add'))

    expect(props.addTask).toHaveBeenCalledWith('Dentist', null, expect.objectContaining({ date: '2099-01-02' }))
  })
})
