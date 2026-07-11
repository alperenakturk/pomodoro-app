import { describe, it, expect } from 'vitest'
import { isCurrentBlock, totalTimetableHours } from './timetable'

describe('isCurrentBlock', () => {
  const block = { start: '09:00', end: '11:00' }

  it('is true when now falls inside the block', () => {
    expect(isCurrentBlock(block, '10:00')).toBe(true)
  })

  it('is true at the exact start and end boundaries', () => {
    expect(isCurrentBlock(block, '09:00')).toBe(true)
    expect(isCurrentBlock(block, '11:00')).toBe(true)
  })

  it('is false before the block starts', () => {
    expect(isCurrentBlock(block, '08:59')).toBe(false)
  })

  it('is false after the block ends', () => {
    expect(isCurrentBlock(block, '11:01')).toBe(false)
  })
})

describe('totalTimetableHours', () => {
  it('sums block durations across midnight-safe hh:mm pairs into hours', () => {
    expect(totalTimetableHours([{ start: '09:00', end: '11:00' }, { start: '13:00', end: '13:30' }])).toBe(2.5)
  })

  it('is 0 for no blocks', () => {
    expect(totalTimetableHours([])).toBe(0)
  })

  it('never goes negative for an inverted (end before start) block', () => {
    expect(totalTimetableHours([{ start: '11:00', end: '09:00' }])).toBe(0)
  })
})
