import { useState, useEffect } from 'react'
import './App.css'
import Workouts from './components/Workouts'
import Dashboard from './components/Dashboard'
import Nutrition from './components/Nutrition'
import Settings from './components/Settings'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('fitnessSettings')
    if (saved) {
      const settings = JSON.parse(saved)
      return settings.theme || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Listen for theme changes from Settings
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('fitnessSettings')
      if (saved) {
        const settings = JSON.parse(saved)
        if (settings.theme && settings.theme !== theme) {
          setTheme(settings.theme)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically for same-tab updates
    const interval = setInterval(() => {
      const saved = localStorage.getItem('fitnessSettings')
      if (saved) {
        const settings = JSON.parse(saved)
        if (settings.theme && settings.theme !== theme) {
          setTheme(settings.theme)
        }
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
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
      </header>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
