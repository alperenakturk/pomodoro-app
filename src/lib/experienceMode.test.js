import { describe, it, expect, afterEach } from 'vitest'
import { resolveExperienceMode, canUseFullMode } from './experienceMode'
import { setDevUnlockLimits } from './devMode'

afterEach(() => {
  setDevUnlockLimits(false)
  localStorage.clear()
})

describe('experience mode with the dev limits lock (default: locked under tests)', () => {
  it('guests are always simple and cannot use full mode', () => {
    expect(resolveExperienceMode({ experienceMode: 'full' }, null)).toBe('simple')
    expect(canUseFullMode(null)).toBe(false)
  })

  it('signed-in users follow their setting', () => {
    expect(resolveExperienceMode({ experienceMode: 'full' }, { id: 'u' })).toBe('full')
    expect(resolveExperienceMode({ experienceMode: 'simple' }, { id: 'u' })).toBe('simple')
    expect(canUseFullMode({ id: 'u' })).toBe(true)
  })

  it('unlocking limits (dev only) lets a guest use and keep full mode', () => {
    setDevUnlockLimits(true)
    expect(canUseFullMode(null)).toBe(true)
    expect(resolveExperienceMode({ experienceMode: 'full' }, null)).toBe('full')
    expect(resolveExperienceMode({ experienceMode: 'simple' }, null)).toBe('simple')
  })
})
