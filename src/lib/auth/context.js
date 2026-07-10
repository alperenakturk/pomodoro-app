import { createContext } from 'react'

// Split into its own file for the same reason as lib/i18n/context.js —
// AuthContext.jsx exports only a component and useAuth.js exports only a
// hook, so neither file co-exports a plain value alongside a component
// (oxlint's only-export-components / Fast Refresh).
export const AuthContext = createContext(null)
