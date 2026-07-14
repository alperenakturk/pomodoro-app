import { describe, it, expect } from 'vitest'
import { pickCoachMark } from './constants'

describe('pickCoachMark', () => {
  it('returns the intro mark for a section on first visit (no conditions needed)', () => {
    const mark = pickCoachMark('timer', [])
    expect(mark.id).toBe('timer-intro')
  })

  it('returns null once every mark in the section has been seen', () => {
    const mark = pickCoachMark('timer', [
      'timer-intro',
      'timer-first-start',
      'timer-first-interruption',
      'timer-first-break',
    ])
    expect(mark).toBeNull()
  })

  it('skips a later mark whose trigger condition is false, even if unseen', () => {
    const mark = pickCoachMark('timer', ['timer-intro'], {
      'timer-first-start': false,
      'timer-first-interruption': false,
      'timer-first-break': false,
    })
    expect(mark).toBeNull()
  })

  it('surfaces the next unseen mark once its condition becomes true', () => {
    const mark = pickCoachMark('timer', ['timer-intro'], {
      'timer-first-start': true,
      'timer-first-interruption': false,
      'timer-first-break': false,
    })
    expect(mark.id).toBe('timer-first-start')
  })

  it('never returns two marks from different sections', () => {
    const mark = pickCoachMark('planning', [], { 'timer-first-start': true })
    expect(mark.id).toBe('planning-intro')
  })
})
