import { createContext, useContext } from 'react'

// Context holds the `showToast(message, type)` function. Kept in its own
// (component-free) file so ToastProvider.jsx stays fast-refresh friendly.
export const ToastContext = createContext(() => {})

export function useToast() {
  return useContext(ToastContext)
}
