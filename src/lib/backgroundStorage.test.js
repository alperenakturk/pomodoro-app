import { describe, it, expect } from 'vitest'
import { validateBackgroundFile, MAX_BACKGROUND_BYTES, ALLOWED_BACKGROUND_TYPES } from './backgroundStorage'

function fakeFile(type, size) {
  return { type, size }
}

describe('validateBackgroundFile', () => {
  it('accepts every allowed type under the size cap', () => {
    for (const type of ALLOWED_BACKGROUND_TYPES) {
      expect(validateBackgroundFile(fakeFile(type, 1024))).toEqual({ valid: true })
    }
  })

  it('rejects an unsupported type', () => {
    expect(validateBackgroundFile(fakeFile('image/gif', 1024))).toEqual({ valid: false, reason: 'type' })
  })

  it('rejects a file over the size cap', () => {
    expect(validateBackgroundFile(fakeFile('image/png', MAX_BACKGROUND_BYTES + 1))).toEqual({
      valid: false,
      reason: 'size',
    })
  })

  it('accepts a file exactly at the size cap', () => {
    expect(validateBackgroundFile(fakeFile('image/png', MAX_BACKGROUND_BYTES))).toEqual({ valid: true })
  })
})
