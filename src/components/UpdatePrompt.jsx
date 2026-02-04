import { useState, useEffect, createContext, useContext } from 'react'
import { registerSW } from 'virtual:pwa-register'
import './UpdatePrompt.css'

const UpdateContext = createContext()

export function useUpdate() {
  return useContext(UpdateContext)
}

export function UpdateProvider({ children }) {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateSW, setUpdateSW] = useState(() => () => {})
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const sw = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onOfflineReady() {
        setOfflineReady(true)
        console.log('App ready to work offline')
      },
      onRegisteredSW(swUrl, registration) {
        console.log('Service Worker registered:', swUrl)
        
        // Check for updates periodically (every 1 hour)
        if (registration) {
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        }
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:', error)
      }
    })
    
    setUpdateSW(() => sw)
  }, [])

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await updateSW(true)
      // Force reload after a short delay if the page doesn't reload automatically
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Update failed:', error)
      // Force reload on error as fallback
      window.location.reload()
    }
  }

  const value = {
    needRefresh,
    offlineReady,
    handleUpdate,
    updating
  }

  return (
    <UpdateContext.Provider value={value}>
      {children}
      {needRefresh && <UpdateModal onUpdate={handleUpdate} updating={updating} />}
    </UpdateContext.Provider>
  )
}

function UpdateModal({ onUpdate, updating }) {
  // Prevent closing the modal by pressing Escape or clicking outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Prevent back navigation
    const handlePopState = (e) => {
      window.history.pushState(null, '', window.location.href)
    }

    // Push a state to prevent back navigation
    window.history.pushState(null, '', window.location.href)
    
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('popstate', handlePopState)

    // Disable scrolling on body
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="update-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title">
      <div className="update-modal">
        <div className="update-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z"/>
          </svg>
        </div>
        <h2 id="update-title" className="update-title">Update Available</h2>
        <p className="update-message">
          A new version of Fitness Tracker is available with important improvements and bug fixes.
        </p>
        <p className="update-instruction">
          Please update now to continue using the app.
        </p>
        <button 
          className="update-button"
          onClick={onUpdate}
          disabled={updating}
        >
          {updating ? (
            <>
              <span className="update-spinner"></span>
              Updating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="update-btn-icon">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-1-6h-3V8h-2v5H8l4 4 4-4z"/>
              </svg>
              Update Now
            </>
          )}
        </button>
        <p className="update-note">
          This update is required to continue using the app.
        </p>
      </div>
    </div>
  )
}

export default UpdateProvider
