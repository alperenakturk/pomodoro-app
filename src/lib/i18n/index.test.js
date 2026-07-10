import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectBrowserLanguage, resolveLanguage, translate, formatDateLocalized } from './index'

describe('detectBrowserLanguage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects Turkish when navigator.language starts with "tr"', () => {
    vi.stubGlobal('navigator', { language: 'tr-TR' })
    expect(detectBrowserLanguage()).toBe('tr')
  })

  it('defaults to English for any other browser language', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' })
    expect(detectBrowserLanguage()).toBe('en')
  })
})

describe('resolveLanguage', () => {
  it('returns the explicit setting when it is a supported language', () => {
    expect(resolveLanguage('tr')).toBe('tr')
    expect(resolveLanguage('en')).toBe('en')
  })

  it('falls back to browser detection when null (not yet explicitly chosen)', () => {
    const original = navigator.language
    Object.defineProperty(window.navigator, 'language', { value: 'tr-TR', configurable: true })
    expect(resolveLanguage(null)).toBe('tr')
    Object.defineProperty(window.navigator, 'language', { value: original, configurable: true })
  })
})

describe('translate', () => {
  it('looks up a nested key in the requested language', () => {
    expect(translate('en', 'timer.start')).toBe('Start')
    expect(translate('tr', 'timer.start')).toBe('Başlat')
  })

  it('interpolates {{vars}} into the template', () => {
    expect(translate('en', 'inventory.itemsCount', { count: 3 })).toBe('3 items')
  })

  it('falls back to English when the key is missing from the target language', () => {
    expect(translate('fr', 'timer.start')).toBe('Start')
  })

  it('falls back to the raw key when missing from every dictionary', () => {
    expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key')
  })
})

describe('formatDateLocalized', () => {
  it('formats an ISO date string per the given locale', () => {
    expect(formatDateLocalized('2026-12-25', 'tr-TR')).toBe('25.12.2026')
    expect(formatDateLocalized('2026-12-25', 'en-US')).toBe('12/25/2026')
  })

  it('parses date parts manually rather than via UTC, avoiding an off-by-one day in negative-offset timezones', () => {
    // Regression check: `new Date('2026-01-01')` is UTC midnight, which in a
    // negative-offset local timezone would print as 2025-12-31. Manual parsing
    // (new Date(y, m-1, d)) always constructs a *local* midnight instead.
    const result = formatDateLocalized('2026-01-01', 'en-US')
    expect(result).toBe('01/01/2026')
  })

  it('returns an empty string for a falsy date', () => {
    expect(formatDateLocalized(null, 'en-US')).toBe('')
    expect(formatDateLocalized('', 'en-US')).toBe('')
  })
})
