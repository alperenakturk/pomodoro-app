import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted so the service worker can precache them for offline use —
// the Google Fonts CDN <link> this replaced wasn't cacheable cross-origin.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/auth/AuthContext.jsx'

// LanguageProvider is instantiated inside App.jsx itself (keyed the same as
// the rest of the per-account render tree) rather than here — see App.jsx's
// own comment on why: language needs to remount alongside theme/
// seenCoachMarks/etc. on sign-in, not be read once at the very first paint
// of the whole app and never revisited.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
