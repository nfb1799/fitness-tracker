import { createContext, useContext } from 'react'

// The auth context object plus the hook to read it live here (no component
// exports) so that AuthProvider.jsx can stay fast-refresh friendly.
export const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}
