import { useState, useEffect } from 'react'
import './Social.css'
import { useAuth } from '../contexts/AuthContext'
import { getSocialFeed } from '../firebase/firestoreService'

function Social() {
  const { currentUser } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'workouts', 'meals'

  useEffect(() => {
    const loadSocialFeed = async () => {
      try {
        setError(null)
        const feed = await getSocialFeed(100)
        setActivities(feed)
      } catch (err) {
        console.error('Error loading social feed:', err)
        setError(err.message || 'Failed to load social feed')
      }
      setLoading(false)
    }
    loadSocialFeed()
  }, [])

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true
    if (filter === 'workouts') return activity.type === 'workout'
    if (filter === 'meals') return activity.type === 'nutrition'
    return true
  })

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="social-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading social feed...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="social-page">
        <div className="empty-feed">
          <span className="empty-icon">⚠️</span>
          <h3>Error loading feed</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="social-page">
      <div className="social-header">
        <h2 className="social-title">Community Feed</h2>
        <p className="social-subtitle">See what others are doing to stay fit!</p>
      </div>

      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Activity
        </button>
        <button 
          className={`filter-tab ${filter === 'workouts' ? 'active' : ''}`}
          onClick={() => setFilter('workouts')}
        >
          💪 Workouts
        </button>
        <button 
          className={`filter-tab ${filter === 'meals' ? 'active' : ''}`}
          onClick={() => setFilter('meals')}
        >
          🍽️ Meals
        </button>
      </div>

      <div className="activity-feed">
        {filteredActivities.length === 0 ? (
          <div className="empty-feed">
            <span className="empty-icon">📭</span>
            <h3>No activity yet</h3>
            <p>Be the first to log a workout or meal!</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div 
              key={activity.id} 
              className={`activity-card ${activity.type} ${activity.userId === currentUser?.uid ? 'own-activity' : ''}`}
            >
              <div className="activity-header">
                <div className="user-avatar">
                  {getInitials(activity.displayName)}
                </div>
                <div className="activity-meta">
                  <span className="user-name">
                    {activity.displayName}
                    {activity.userId === currentUser?.uid && <span className="you-badge">You</span>}
                  </span>
                  <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
                </div>
                <span className={`activity-type-badge ${activity.type}`}>
                  {activity.type === 'workout' ? '💪 Workout' : '🍽️ Meal'}
                </span>
              </div>

              <div className="activity-content">
                {activity.type === 'workout' ? (
                  <div className="workout-activity">
                    <h4 className="activity-name">{activity.data.name}</h4>
                    <div className="workout-stats">
                      <div className="stat-item">
                        <span className="stat-value">{activity.data.reps}</span>
                        <span className="stat-label">Reps</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">{activity.data.resistance}</span>
                        <span className="stat-label">lbs</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="nutrition-activity">
                    <h4 className="activity-name">{activity.data.name}</h4>
                    <div className="nutrition-stats">
                      <div className="macro-item calories">
                        <span className="macro-value">{activity.data.calories}</span>
                        <span className="macro-label">cal</span>
                      </div>
                      <div className="macro-item protein">
                        <span className="macro-value">{activity.data.protein || 0}g</span>
                        <span className="macro-label">protein</span>
                      </div>
                      <div className="macro-item carbs">
                        <span className="macro-value">{activity.data.carbs || 0}g</span>
                        <span className="macro-label">carbs</span>
                      </div>
                      <div className="macro-item fat">
                        <span className="macro-value">{activity.data.fat || 0}g</span>
                        <span className="macro-label">fat</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="activity-footer">
                <span className="activity-date">
                  📅 {activity.data.date || activity.data.localTimestamp?.split(',')[0]}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Social
