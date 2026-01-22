import { useState, useEffect } from 'react'
import './App.css'
import Workouts from './components/Workouts'
import Dashboard from './components/Dashboard'
import Nutrition from './components/Nutrition'
import Settings from './components/Settings'
import Auth from './components/Auth'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { currentUser, logout, userProfile } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for theme changes from Settings
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'theme' && e.newValue && e.newValue !== theme) {
        setTheme(e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [theme])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'workouts':
        return <Workouts />
      case 'nutrition':
        return <Nutrition />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setCurrentPage('dashboard')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Show auth screen if not logged in
  if (!currentUser) {
    return <Auth />
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">Fitness Tracker</h1>
        <nav className="nav">
          <button 
            className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-btn ${currentPage === 'workouts' ? 'active' : ''}`}
            onClick={() => setCurrentPage('workouts')}
          >
            Workouts
          </button>
          <button 
            className={`nav-btn ${currentPage === 'nutrition' ? 'active' : ''}`}
            onClick={() => setCurrentPage('nutrition')}
          >
            Nutrition
          </button>
          <button 
            className={`nav-btn ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentPage('settings')}
          >
            Settings
          </button>
        </nav>
        <div className="user-menu">
          <span className="user-name">{currentUser.displayName || currentUser.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
