import { useContext } from 'react'
import { LanguageContext } from '../lib/i18n/context'

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider')
  return ctx
}
