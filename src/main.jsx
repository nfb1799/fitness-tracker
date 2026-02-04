import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { UpdateProvider } from './components/UpdatePrompt'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UpdateProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </UpdateProvider>
  </StrictMode>,
)
