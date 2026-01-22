import { useState, useEffect } from 'react'
import './OfflineIndicator.css'

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner && isOnline) return null

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <span className="status-icon">{isOnline ? '✓' : '⚡'}</span>
      <span className="status-text">
        {isOnline ? 'Back online!' : 'You\'re offline - some features may be limited'}
      </span>
    </div>
  )
}

export default OfflineIndicator
