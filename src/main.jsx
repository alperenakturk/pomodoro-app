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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
