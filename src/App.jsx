import { useState, useEffect } from 'react'
import './App.css'
import Workouts from './components/Workouts'
import Dashboard from './components/Dashboard'
import Nutrition from './components/Nutrition'
import WeighIns from './components/WeighIns'
import Settings from './components/Settings'
import Analytics from './components/Analytics'
import Goals from './components/Goals'
import Auth from './components/Auth'
import OfflineIndicator from './components/OfflineIndicator'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { currentUser, logout, userProfile } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [logChooserOpen, setLogChooserOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('theme', 'dark')
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'workouts':  return <Workouts />
      case 'nutrition': return <Nutrition />
      case 'weighins':  return <WeighIns />
      case 'analytics': return <Analytics />
      case 'goals':     return <Goals />
      case 'settings':  return <Settings />
      default: return <Dashboard />
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setCurrentPage('dashboard')
      setProfileMenuOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const goTo = (page) => {
    setCurrentPage(page)
    setLogChooserOpen(false)
    setProfileMenuOpen(false)
  }

  // Tab is "active" for dashboard/log/trends/goals top-level tabs.
  // 'data' tab covers analytics + weigh-ins.
  const activeTab =
    currentPage === 'dashboard' ? 'home' :
    (currentPage === 'workouts' || currentPage === 'nutrition') ? 'log' :
    (currentPage === 'analytics' || currentPage === 'weighins') ? 'data' :
    currentPage === 'goals' ? 'goals' :
    null

  const initials = (userProfile?.displayName || currentUser?.email || 'U')
    .trim().charAt(0).toUpperCase()

  if (!currentUser) {
    return <Auth />
  }

  const tabs = [
    {
      id: 'home', label: 'Today',
      icon: (c) => <rect x="3" y="3" width="14" height="14" rx="3" stroke={c} strokeWidth="1.6" fill="none"/>,
      onClick: () => goTo('dashboard'),
    },
    {
      id: 'log', label: 'Log',
      icon: (c) => <g><line x1="10" y1="4" x2="10" y2="16" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><line x1="4" y1="10" x2="16" y2="10" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></g>,
      onClick: () => setLogChooserOpen(true),
    },
    {
      id: 'data', label: 'Trends',
      icon: (c) => <polyline points="3,14 7,9 11,12 17,5" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
      onClick: () => goTo('analytics'),
    },
    {
      id: 'goals', label: 'Goals',
      icon: (c) => <circle cx="10" cy="10" r="6" stroke={c} strokeWidth="1.6" fill="none"/>,
      onClick: () => goTo('goals'),
    },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-brand-sub hy-sub-label">FITTRACK</span>
          <h1 className="app-brand">
            {currentPage === 'dashboard' && 'Today'}
            {currentPage === 'nutrition' && 'Log meal'}
            {currentPage === 'workouts' && 'Log workout'}
            {currentPage === 'weighins' && 'Weight'}
            {currentPage === 'analytics' && 'Trends'}
            {currentPage === 'goals' && 'Goals'}
            {currentPage === 'settings' && 'Settings'}
          </h1>
        </div>
        <button
          className="app-avatar"
          onClick={() => setProfileMenuOpen(v => !v)}
          aria-label="Profile menu"
        >
          {initials}
        </button>
      </header>

      {profileMenuOpen && (
        <>
          <div className="app-overlay" onClick={() => setProfileMenuOpen(false)} />
          <div className="profile-menu">
            <div className="profile-menu-head">
              <div className="profile-menu-name">{userProfile?.displayName || 'User'}</div>
              <div className="profile-menu-mail">{currentUser?.email || 'Anonymous'}</div>
            </div>
            <button className="profile-menu-item" onClick={() => goTo('settings')}>
              Settings
            </button>
            <button className="profile-menu-item danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </>
      )}

      <main className="main-content">
        {renderPage()}
      </main>

      {/* Log chooser sheet */}
      {logChooserOpen && (
        <>
          <div className="app-overlay" onClick={() => setLogChooserOpen(false)} />
          <div className="log-sheet" role="dialog" aria-label="What are you logging?">
            <div className="log-sheet-grip" />
            <div className="log-sheet-head">
              <span className="hy-section-label">What are you logging?</span>
            </div>
            <button className="log-sheet-item" onClick={() => goTo('nutrition')}>
              <span className="log-sheet-icon">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M5 3 v9 a2 2 0 0 0 2 2 h0 v3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 3 v5 a1 1 0 0 1 -2 0 v-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                  <path d="M14 3 c-2 0 -3 3 -3 6 c0 1 1 2 2 2 h1 v6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="log-sheet-text">
                <span className="log-sheet-title">Meal</span>
                <span className="log-sheet-sub">FREE-TEXT · MACROS</span>
              </div>
              <span className="log-sheet-chev">›</span>
            </button>
            <button className="log-sheet-item" onClick={() => goTo('workouts')}>
              <span className="log-sheet-icon">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <rect x="2" y="8" width="2.5" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  <rect x="15.5" y="8" width="2.5" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  <line x1="4.5" y1="10" x2="15.5" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <rect x="5.5" y="6.5" width="1.5" height="7" rx="0.5" fill="currentColor"/>
                  <rect x="13" y="6.5" width="1.5" height="7" rx="0.5" fill="currentColor"/>
                </svg>
              </span>
              <div className="log-sheet-text">
                <span className="log-sheet-title">Workout</span>
                <span className="log-sheet-sub">SETS · REPS · TIME</span>
              </div>
              <span className="log-sheet-chev">›</span>
            </button>
            <button className="log-sheet-item" onClick={() => goTo('weighins')}>
              <span className="log-sheet-icon">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <rect x="3" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M10 7 v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="10" cy="13" r="0.8" fill="currentColor"/>
                </svg>
              </span>
              <div className="log-sheet-text">
                <span className="log-sheet-title">Weight</span>
                <span className="log-sheet-sub">OCCASIONAL CHECK-IN</span>
              </div>
              <span className="log-sheet-chev">›</span>
            </button>
            <button className="log-sheet-cancel" onClick={() => setLogChooserOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav className="bottom-tabs">
        {tabs.map(t => {
          const isActive = t.id === activeTab
          const color = isActive ? 'var(--accent-primary)' : 'var(--text-dimmed)'
          return (
            <button
              key={t.id}
              className={`bottom-tab ${isActive ? 'active' : ''}`}
              onClick={t.onClick}
              style={{ color }}
            >
              <svg width="22" height="22" viewBox="0 0 20 20">{t.icon(color)}</svg>
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>

      <OfflineIndicator />
    </div>
  )
}

export default App
