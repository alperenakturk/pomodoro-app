import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodayTasks } from './useTodayTasks'
import { loadActivityLog } from '../lib/storage'
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
})
