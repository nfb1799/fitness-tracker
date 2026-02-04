import { useState, useEffect } from 'react'
import './App.css'
import Workouts from './components/Workouts'
import Dashboard from './components/Dashboard'
import Nutrition from './components/Nutrition'
import WeighIns from './components/WeighIns'
import Settings from './components/Settings'
import Social from './components/Social'
import Analytics from './components/Analytics'
import Auth from './components/Auth'
import OfflineIndicator from './components/OfflineIndicator'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { currentUser, logout, userProfile } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      case 'weighins':
        return <WeighIns />
      case 'social':
        return <Social />
      case 'analytics':
        return <Analytics />
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
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleNavClick = (page) => {
    setCurrentPage(page)
    setMobileMenuOpen(false)
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'workouts', label: 'Workouts', icon: '💪' },
    { id: 'nutrition', label: 'Nutrition', icon: '🍎' },
    { id: 'weighins', label: 'Weigh-Ins', icon: '⚖️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  // Show auth screen if not logged in
  if (!currentUser) {
    return <Auth />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">💪 FitTrack</h1>
        </div>

        <button 
          className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav ${mobileMenuOpen ? 'open' : ''}`}>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
          <div className="nav-divider"></div>
          <button className="nav-btn logout" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </nav>
      </header>

      <main className="main-content">
        {renderPage()}
      </main>

      <OfflineIndicator />
    </div>
  )
}

export default App
