import { createContext } from 'react'

// Split into its own file (rather than living alongside LanguageProvider) so
// LanguageContext.jsx only exports a component and useTranslation.js only
// exports a hook — co-exporting a plain value from a component file breaks
// Fast Refresh (oxlint's only-export-components warns on this), same reason
// pomodoroMath.js/timetable.js are split out from their components.
export const LanguageContext = createContext(null)
