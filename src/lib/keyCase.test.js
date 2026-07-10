import { describe, it, expect } from 'vitest'
import { camelToSnakeKey, snakeToCamelKey, mapKeysToSnake, mapKeysToCamel } from './keyCase'

describe('camelToSnakeKey / snakeToCamelKey', () => {
  it('round-trips ordinary camelCase field names', () => {
    const pairs = [
      ['categoryIds', 'category_ids'],
      ['inventoryId', 'inventory_id'],
      ['elapsedSeconds', 'elapsed_seconds'],
      ['sessionType', 'session_type'],
      ['secondsLeft', 'seconds_left'],
      ['isRunning', 'is_running'],
      ['cycleLength', 'cycle_length'],
      ['chimeStyle', 'chime_style'],
      ['onboardingDismissed', 'onboarding_dismissed'],
      ['userId', 'user_id'],
      ['createdAt', 'created_at'],
      ['updatedAt', 'updated_at'],
    ]
    for (const [camel, snake] of pairs) {
      expect(camelToSnakeKey(camel)).toBe(snake)
      expect(snakeToCamelKey(snake)).toBe(camel)
    }
  })

  it('leaves already-lowercase single-word fields unchanged', () => {
    for (const key of ['id', 'date', 'time', 'type', 'name', 'text', 'notes', 'real', 'diff']) {
      expect(camelToSnakeKey(key)).toBe(key)
      expect(snakeToCamelKey(key)).toBe(key)
    }
  })

  it('handles diffI/diffII via explicit override (the generic algorithm cannot round-trip these)', () => {
    expect(camelToSnakeKey('diffI')).toBe('diff_i')
    expect(camelToSnakeKey('diffII')).toBe('diff_ii')
    expect(snakeToCamelKey('diff_i')).toBe('diffI')
    expect(snakeToCamelKey('diff_ii')).toBe('diffII')
  })
})

describe('mapKeysToSnake / mapKeysToCamel', () => {
  it('converts every key in a flat object, preserving values', () => {
    const record = { id: 'r1', categoryIds: ['a', 'b'], diffII: 3, userId: 'local' }
    const snake = mapKeysToSnake(record)
    expect(snake).toEqual({ id: 'r1', category_ids: ['a', 'b'], diff_ii: 3, user_id: 'local' })
    expect(mapKeysToCamel(snake)).toEqual(record)
  })
})
