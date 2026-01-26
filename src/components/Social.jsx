import { useState, useEffect } from 'react'
import './Social.css'
import { useAuth } from '../contexts/AuthContext'
import { getSocialFeed, addReaction, getReactions } from '../firebase/firestoreService'
import UserProfile from './UserProfile'

const REACTION_EMOJIS = ['👍', '💪', '🔥', '❤️', '👏', '🎉']

function Social() {
  const { currentUser } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'workouts', 'meals'
  const [reactions, setReactions] = useState({})
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)

  useEffect(() => {
    const loadSocialFeed = async () => {
      try {
        setError(null)
        const feed = await getSocialFeed(100)
        setActivities(feed)
        
        // Load reactions for all activities
        if (feed.length > 0) {
          const activityIds = feed.map(a => a.id)
          const reactionsData = await getReactions(activityIds)
          setReactions(reactionsData)
        }
      } catch (err) {
        console.error('Error loading social feed:', err)
        setError(err.message || 'Failed to load social feed')
      }
      setLoading(false)
    }
    loadSocialFeed()
  }, [])

  const handleReaction = async (activityId, emoji) => {
    if (!currentUser) return
    
    try {
      const result = await addReaction(activityId, {
        activityId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        emoji
      })
      
      // Update local reactions state
      setReactions(prev => {
        const activityReactions = prev[activityId] || []
        const existingIndex = activityReactions.findIndex(r => r.userId === currentUser.uid)
        
        if (result.action === 'removed') {
          return {
            ...prev,
            [activityId]: activityReactions.filter(r => r.userId !== currentUser.uid)
          }
        } else if (result.action === 'updated') {
          const updated = [...activityReactions]
          updated[existingIndex] = { ...updated[existingIndex], emoji }
          return { ...prev, [activityId]: updated }
        } else {
          return {
            ...prev,
            [activityId]: [...activityReactions, {
              id: result.id,
              userId: currentUser.uid,
              userName: currentUser.displayName || currentUser.email,
              emoji
            }]
          }
        }
      })
    } catch (err) {
      console.error('Error adding reaction:', err)
    }
    
    setShowReactionPicker(null)
  }

  const getReactionSummary = (activityId) => {
    const activityReactions = reactions[activityId] || []
    const summary = {}
    activityReactions.forEach(r => {
      if (!summary[r.emoji]) summary[r.emoji] = []
      summary[r.emoji].push(r.userName)
    })
    return summary
  }

  const getUserReaction = (activityId) => {
    const activityReactions = reactions[activityId] || []
    return activityReactions.find(r => r.userId === currentUser?.uid)?.emoji
  }

  const handleViewProfile = (userId) => {
    setViewingProfile(userId)
  }

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

  // If viewing a profile, show the profile component
  if (viewingProfile) {
    return (
      <UserProfile 
        userId={viewingProfile} 
        onBack={() => setViewingProfile(null)} 
      />
    )
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
          🍽️ Nutrition
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
                <div 
                  className="user-avatar clickable"
                  onClick={() => handleViewProfile(activity.userId)}
                  title={`View ${activity.displayName}'s profile`}
                >
                  {getInitials(activity.displayName)}
                </div>
                <div className="activity-meta">
                  <span 
                    className="user-name clickable"
                    onClick={() => handleViewProfile(activity.userId)}
                    title={`View ${activity.displayName}'s profile`}
                  >
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
                <div className="reactions-section">
                  {/* Reaction summary */}
                  <div className="reaction-summary">
                    {Object.entries(getReactionSummary(activity.id)).map(([emoji, users]) => (
                      <span 
                        key={emoji} 
                        className={`reaction-badge ${getUserReaction(activity.id) === emoji ? 'user-reacted' : ''}`}
                        title={users.join(', ')}
                        onClick={() => handleReaction(activity.id, emoji)}
                      >
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                  
                  {/* Add reaction button */}
                  <div className="reaction-picker-wrapper">
                    <button 
                      className="add-reaction-btn"
                      onClick={() => setShowReactionPicker(showReactionPicker === activity.id ? null : activity.id)}
                      title="Add reaction"
                    >
                      {getUserReaction(activity.id) || '😀'} +
                    </button>
                    
                    {showReactionPicker === activity.id && (
                      <div className="reaction-picker">
                        {REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            className={`reaction-option ${getUserReaction(activity.id) === emoji ? 'selected' : ''}`}
                            onClick={() => handleReaction(activity.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
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
