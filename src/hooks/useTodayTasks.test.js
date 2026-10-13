import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodayTasks, bucketTasksByDay } from './useTodayTasks'
import { loadActivityLog, loadTodayTasks } from '../lib/storage'
import { todayString } from '../lib/dateKey'
import { playTaskCompleteChime } from '../lib/alert'

vi.mock('../lib/alert', () => ({
  playTaskCompleteChime: vi.fn(),
}))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTodayTasks', () => {
  it('adds a task with reestimate slots empty', () => {
    const { result } = renderHook(() => useTodayTasks())
    act(() => result.current.addTask('Write report', 2))

    expect(result.current.tasks[0]).toMatchObject({
      text: 'Write report',
      estimate: 2,
      realized: 0,
      reestimate1: null,
      reestimate2: null,
    })
  })

  it('defaults categoryIds/notes to []/empty, and accepts multiple tags via options', () => {
    const { result } = renderHook(() => useTodayTasks())
    act(() => result.current.addTask('Write report', 2))
    expect(result.current.tasks[0]).toMatchObject({ categoryIds: [], notes: '' })
    expect(result.current.tasks[0].pairWith).toBeUndefined()

    act(() =>
      result.current.addTask('Fix bug', 1, { categoryIds: ['cat1', 'cat2'], notes: 'See ticket #42' })
    )
    expect(result.current.tasks[1]).toMatchObject({ categoryIds: ['cat1', 'cat2'], notes: 'See ticket #42' })
  })

  describe('reestimateTask', () => {
    it('fills reestimate1 first, then reestimate2', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('Task A', 2))
      const id = result.current.tasks[0].id

      act(() => result.current.reestimateTask(id, 4))
      expect(result.current.tasks[0].reestimate1).toBe(4)
      expect(result.current.tasks[0].reestimate2).toBeNull()

      act(() => result.current.reestimateTask(id, 6))
      expect(result.current.tasks[0].reestimate1).toBe(4)
      expect(result.current.tasks[0].reestimate2).toBe(6)
    })

    it('ignores invalid values', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('Task A', 2))
      const id = result.current.tasks[0].id

      act(() => result.current.reestimateTask(id, 0))
      act(() => result.current.reestimateTask(id, NaN))
      expect(result.current.tasks[0].reestimate1).toBeNull()
    })

    it('rejects a third re-estimate and leaves reestimate2 untouched', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('Task A', 2))
      const id = result.current.tasks[0].id

      act(() => result.current.reestimateTask(id, 4))
      act(() => result.current.reestimateTask(id, 6))

      let accepted
      act(() => {
        accepted = result.current.reestimateTask(id, 8)
      })

      expect(accepted).toBe(false)
      expect(result.current.tasks[0].reestimate1).toBe(4)
      expect(result.current.tasks[0].reestimate2).toBe(6)
    })
  })

  describe('finishTask', () => {
    it('carries all category tags and notes into the archived Activity Log record', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() =>
        result.current.addTask('Task A', 2, { categoryIds: ['cat1', 'cat2'], notes: 'Some detail' })
      )
      const id = result.current.tasks[0].id

      act(() => result.current.finishTask(id))

      const [record] = loadActivityLog()
      expect(record).toMatchObject({ categoryIds: ['cat1', 'cat2'], notes: 'Some detail' })
      expect(record.pairWith).toBeUndefined()
      expect(record.type).toBeUndefined()
    })

    it('records diff, diffI and diffII against each successive estimate', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('Task A', 2))
      const id = result.current.tasks[0].id

      act(() => result.current.reestimateTask(id, 4))
      act(() => result.current.reestimateTask(id, 6))
      for (let i = 0; i < 5; i++) {
        act(() => result.current.incrementRealized(id))
      }

      act(() => result.current.finishTask(id))

      const [record] = loadActivityLog()
      expect(record).toMatchObject({
        estimate: 2,
        reestimate1: 4,
        reestimate2: 6,
        real: 5,
        diff: 3, // 5 - 2
        diffI: 1, // 5 - 4
        diffII: -1, // 5 - 6
      })
      expect(result.current.tasks[0].done).toBe(true)
      expect(playTaskCompleteChime).toHaveBeenCalledTimes(1)
    })

    it('stores null diffs when the task was never estimated', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('Task A', null))
      const id = result.current.tasks[0].id

      act(() => result.current.finishTask(id))

      const [record] = loadActivityLog()
      expect(record.diff).toBeNull()
      expect(record.diffI).toBeNull()
      expect(record.diffII).toBeNull()
    })
  })

  // Backs the "Check to bottom" setting — App.jsx calls this after
  // finishTask only when that setting is enabled (default off).
  describe('moveTaskToEnd', () => {
    it('moves the given task to the end, preserving the relative order of the rest', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('A', 1))
      act(() => result.current.addTask('B', 1))
      act(() => result.current.addTask('C', 1))
      const idA = result.current.tasks[0].id

      act(() => result.current.moveTaskToEnd(idA))

      expect(result.current.tasks.map((t) => t.text)).toEqual(['B', 'C', 'A'])
    })

    it('does nothing when the id does not match any task', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('A', 1))
      act(() => result.current.addTask('B', 1))

      act(() => result.current.moveTaskToEnd('nonexistent-id'))

      expect(result.current.tasks.map((t) => t.text)).toEqual(['A', 'B'])
    })
  })

  // Bulk actions (TodoToday.jsx's "..." menu).
  describe('clearFinishedTasks', () => {
    it('removes only tasks marked done, keeping the rest in order', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('A', 1))
      act(() => result.current.addTask('B', 1))
      act(() => result.current.addTask('C', 1))
      const idB = result.current.tasks[1].id
      act(() => result.current.finishTask(idB))

      act(() => result.current.clearFinishedTasks())

      expect(result.current.tasks.map((t) => t.text)).toEqual(['A', 'C'])
    })

    it('clears activeTaskId if it pointed at a task that got cleared', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('A', 1))
      const id = result.current.tasks[0].id
      act(() => result.current.finishTask(id))
      // finishTask already clears activeTaskId, so set it back manually to
      // exercise clearFinishedTasks' own defensive guard in isolation.
      act(() => result.current.setActiveTaskId(id))

      act(() => result.current.clearFinishedTasks())

      expect(result.current.activeTaskId).toBeNull()
    })

    it('leaves an unrelated active task alone', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('A', 1))
      act(() => result.current.addTask('B', 1))
      const idA = result.current.tasks[0].id
      const idB = result.current.tasks[1].id
      act(() => result.current.finishTask(idB))
      act(() => result.current.setActiveTaskId(idA))

      act(() => result.current.clearFinishedTasks())

      expect(result.current.activeTaskId).toBe(idA)
    })
  })

  describe('clearAllTasks', () => {
    it('removes every task and clears the active selection', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => result.current.addTask('A', 1))
      act(() => result.current.addTask('B', 1))
      act(() => result.current.setActiveTaskId(result.current.tasks[0].id))

      act(() => result.current.clearAllTasks())

      expect(result.current.tasks).toEqual([])
      expect(result.current.activeTaskId).toBeNull()
    })
  })

  it('tracks and undoes interruptions independently of finishing', () => {
    const { result } = renderHook(() => useTodayTasks())
    act(() => result.current.addTask('Task A', 2))
    const id = result.current.tasks[0].id

    act(() => result.current.addInterruption(id, 'internal', 1))
    act(() => result.current.addInterruption(id, 'external', 1))
    expect(result.current.tasks[0].internal).toBe(1)
    expect(result.current.tasks[0].external).toBe(1)

    act(() => result.current.addInterruption(id, 'internal', -1))
    expect(result.current.tasks[0].internal).toBe(0)
  })

  // OPTIMIZATIONS.md finding #3: single-item edits (updateTask, finishTask,
  // reestimateTask, addInterruption, incrementRealized) now stamp updatedAt
  // on just the touched task, leaving every sibling task's object (and its
  // own updatedAt) exactly as it was — see useInventory.test.js's identical
  // describe block for the full rationale.
  describe('updatedAt on edit (finding #3)', () => {
    it('bumps updatedAt only on the edited task for updateTask, addInterruption, and reestimateTask', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => {
        result.current.addTask('Task A', 2)
        result.current.addTask('Task B', 2)
      })
      const [a, b] = result.current.tasks

      act(() => result.current.updateTask(a.id, { text: 'Task A (renamed)' }))
      let [updatedA, untouchedB] = result.current.tasks
      expect(updatedA.updatedAt).toEqual(expect.any(String))
      expect(untouchedB.updatedAt).toBe(b.updatedAt)

      const afterRename = updatedA.updatedAt
      act(() => result.current.addInterruption(a.id, 'internal', 1))
      ;[updatedA, untouchedB] = result.current.tasks
      expect(updatedA.updatedAt).toEqual(expect.any(String))
      expect(untouchedB.updatedAt).toBe(b.updatedAt)

      act(() => result.current.reestimateTask(a.id, 4))
      ;[updatedA, untouchedB] = result.current.tasks
      expect(updatedA.updatedAt).toEqual(expect.any(String))
      expect(untouchedB.updatedAt).toBe(b.updatedAt)
      // Not asserting inequality between successive timestamps here (fake
      // timers aren't in play, so two same-millisecond stamps are possible
      // and not a bug) — the point is only that it's a real stamp each time
      // and B is never touched.
      expect(afterRename).toEqual(expect.any(String))
    })

    it('bumps updatedAt when finishTask marks a task done, without touching an unrelated task', () => {
      const { result } = renderHook(() => useTodayTasks())
      act(() => {
        result.current.addTask('Task A', 2)
        result.current.addTask('Task B', 2)
      })
      const [a, b] = result.current.tasks

      act(() => result.current.finishTask(a.id))

      const finished = result.current.tasks.find((t) => t.id === a.id)
      const untouched = result.current.tasks.find((t) => t.id === b.id)
      expect(finished.updatedAt).toEqual(expect.any(String))
      expect(untouched.updatedAt).toBe(b.updatedAt)
    })
  })
})

describe('dated tasks', () => {
  it('stamps new tasks with today', () => {
    const { result } = renderHook(() => useTodayTasks())
    act(() => result.current.addTask('A', 1))
    expect(result.current.tasks[0].date).toBe(todayString())
  })

  it('stamps a pre-date-era task (date: null) with the day it is first seen, and persists it', () => {
    localStorage.setItem('pomodoro_today_tasks', JSON.stringify([{ id: 'old', text: 'Old task' }]))
    const { result } = renderHook(() => useTodayTasks())
    expect(result.current.tasks[0].date).toBe(todayString())
    expect(loadTodayTasks()[0].date).toBe(todayString())
  })

  it("moves yesterday's unfinished task into carriedTasks when the day rolls over, and keeps it out of today's list", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 10, 12))
    const { result, rerender } = renderHook(() => useTodayTasks())
    act(() => result.current.addTask('Unfinished', 1))
    expect(result.current.tasks).toHaveLength(1)

    vi.setSystemTime(new Date(2026, 5, 11, 9))
    rerender()

    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.carriedTasks.map((t) => t.text)).toEqual(['Unfinished'])
    vi.useRealTimers()
  })

  it('moveTaskToDate brings a carried task to today, or postpones it to a later date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 10, 12))
    const { result, rerender } = renderHook(() => useTodayTasks())
    act(() => {
      result.current.addTask('A', 1)
      result.current.addTask('B', 1)
    })
    vi.setSystemTime(new Date(2026, 5, 11, 9))
    rerender()
    const [a, b] = result.current.carriedTasks

    act(() => result.current.moveTaskToDate(a.id, '2026-06-11'))
    act(() => result.current.moveTaskToDate(b.id, '2026-06-15'))

    expect(result.current.tasks.map((t) => t.text)).toEqual(['A'])
    expect(result.current.laterTasks.map((t) => t.text)).toEqual(['B'])
    expect(result.current.carriedTasks).toHaveLength(0)
    vi.useRealTimers()
  })

  it('a postponed task shows up in today list on its date, and moving it clears it as the active task', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 10, 12))
    const { result, rerender } = renderHook(() => useTodayTasks())
    let id
    act(() => {
      id = result.current.addTask('A', 1)
    })
    act(() => result.current.setActiveTaskId(id))
    act(() => result.current.moveTaskToDate(id, '2026-06-15'))
    expect(result.current.activeTaskId).toBeNull()

    vi.setSystemTime(new Date(2026, 5, 15, 8))
    rerender()
    expect(result.current.tasks.map((t) => t.text)).toEqual(['A'])
    expect(result.current.laterTasks).toHaveLength(0)
    vi.useRealTimers()
  })
})

describe('bucketTasksByDay', () => {
  const today = '2026-06-10'
  const t = (id, date, done = false) => ({ id, date, done })

  it('splits tasks into today / carried / later', () => {
    const { todayTasks, carriedTasks, laterTasks } = bucketTasksByDay(
      [t('a', today), t('b', null), t('c', '2026-06-09'), t('d', '2026-06-12')],
      today
    )
    expect(todayTasks.map((x) => x.id)).toEqual(['a', 'b'])
    expect(carriedTasks.map((x) => x.id)).toEqual(['c'])
    expect(laterTasks.map((x) => x.id)).toEqual(['d'])
  })

  it('drops a finished task from a past day (it already lives in the activity log)', () => {
    const { todayTasks, carriedTasks } = bucketTasksByDay([t('a', '2026-06-09', true)], today)
    expect(todayTasks).toHaveLength(0)
    expect(carriedTasks).toHaveLength(0)
  })

  it('keeps a finished task from today visible', () => {
    expect(bucketTasksByDay([t('a', today, true)], today).todayTasks).toHaveLength(1)
  })
})

describe('adding a task for another day', () => {
  it('a task added with a future date goes to laterTasks, not today', () => {
    const { result } = renderHook(() => useTodayTasks())
    act(() => result.current.addTask('Dentist', 1, { date: '2099-01-02' }))
    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.laterTasks.map((t) => t.text)).toEqual(['Dentist'])
    expect(result.current.laterTasks[0].date).toBe('2099-01-02')
  })
})

