import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimetable } from './useTimetable'
import { loadTimetable, saveTimetable } from '../lib/storage'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

beforeEach(() => {
  localStorage.clear()
})

describe('useTimetable', () => {
  it('adds a block stamped with today\'s date', () => {
    const { result } = renderHook(() => useTimetable())
    act(() => result.current.addBlock('09:00', '11:00', 'Deep work'))

    expect(result.current.blocks[0]).toMatchObject({
      date: todayString(),
      start: '09:00',
      end: '11:00',
      label: 'Deep work',
    })
  })

  it('keeps blocks sorted by start time', () => {
    const { result } = renderHook(() => useTimetable())
    act(() => {
      result.current.addBlock('14:00', '15:00')
      result.current.addBlock('09:00', '10:00')
    })
    expect(result.current.blocks.map((b) => b.start)).toEqual(['09:00', '14:00'])
  })

  it('removes a block', () => {
    const { result } = renderHook(() => useTimetable())
    act(() => result.current.addBlock('09:00', '10:00'))
    const id = result.current.blocks[0].id

    act(() => result.current.removeBlock(id))
    expect(result.current.blocks).toHaveLength(0)
  })

  // A block planned for a previous day shouldn't linger and look like it's
  // still today's schedule.
  it('prunes blocks left over from a previous day', () => {
    saveTimetable([
      { id: 'stale', date: '2020-01-01', start: '09:00', end: '10:00', label: 'Old' },
    ])

    const { result } = renderHook(() => useTimetable())

    expect(result.current.blocks).toHaveLength(0)
    expect(loadTimetable()).toHaveLength(0)
  })
})
