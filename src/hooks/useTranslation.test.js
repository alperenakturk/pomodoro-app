import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTranslation } from './useTranslation'
import { LanguageProvider } from '../lib/i18n/LanguageContext.jsx'
import { loadSettings } from '../lib/storage'

beforeEach(() => {
  localStorage.clear()
})

function renderWithProvider() {
  return renderHook(() => useTranslation(), { wrapper: LanguageProvider })
}

describe('useTranslation', () => {
  it('throws when used outside a LanguageProvider', () => {
    expect(() => renderHook(() => useTranslation())).toThrow(
      'useTranslation must be used within a LanguageProvider'
    )
  })

  it('defaults to English when navigator.language is not Turkish (jsdom default)', () => {
    const { result } = renderWithProvider()
    expect(result.current.language).toBe('en')
    expect(result.current.t('timer.start')).toBe('Start')
  })

  it('uses an explicitly-set language from settings on mount, overriding auto-detect', () => {
    localStorage.setItem('pomodoro_settings', JSON.stringify({ language: 'tr' }))
    const { result } = renderWithProvider()
    expect(result.current.language).toBe('tr')
    expect(result.current.t('timer.start')).toBe('Başlat')
  })

  it('setLanguage updates the translator live and persists the choice', () => {
    const { result } = renderWithProvider()
    act(() => result.current.setLanguage('tr'))

    expect(result.current.language).toBe('tr')
    expect(result.current.t('timer.start')).toBe('Başlat')
    expect(loadSettings().language).toBe('tr')
  })

  it('interpolates variables through the shared translate function', () => {
    const { result } = renderWithProvider()
    expect(result.current.t('inventory.itemsCount', { count: 5 })).toBe('5 items')
  })
})
