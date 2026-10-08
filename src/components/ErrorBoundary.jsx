import { Component } from 'react'
import { resolveLanguage, translate } from '../lib/i18n'

// Sits above App (and therefore above LanguageProvider), so it can't use
// the language context — falls back to browser-language detection.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const language = resolveLanguage(null)
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">{translate(language, 'errorBoundary.title')}</h1>
        <p className="max-w-md opacity-80">{translate(language, 'errorBoundary.body')}</p>
        <button
          type="button"
          className="rounded-lg border px-4 py-2"
          onClick={() => window.location.reload()}
        >
          {translate(language, 'errorBoundary.reload')}
        </button>
      </div>
    )
  }
}
