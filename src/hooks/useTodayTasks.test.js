import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodayTasks } from './useTodayTasks'
import { loadActivityLog } from '../lib/storage'

beforeEach(() => {
  localStorage.clear()
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
  })

  describe('finishTask', () => {
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
