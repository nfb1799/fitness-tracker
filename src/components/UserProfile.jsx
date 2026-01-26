import { useState, useEffect } from 'react'
import './UserProfile.css'
import { useAuth } from '../contexts/AuthContext'
import { 
  getUserProfileData, 
  getProfileComments, 
  addProfileComment, 
  deleteProfileComment 
} from '../firebase/firestoreService'

function UserProfile({ userId, onBack }) {
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError(null)
        const [profileData, commentsData] = await Promise.all([
          getUserProfileData(userId),
          getProfileComments(userId)
        ])
        if (!profileData) {
          setError('User profile not found')
        } else {
          setProfile(profileData)
          setComments(commentsData)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        setError(err.message || 'Failed to load profile')
      }
      setLoading(false)
    }
    loadProfile()
  }, [userId])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || submittingComment) return

    setSubmittingComment(true)
    try {
      const comment = {
        text: newComment.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email
      }
      const id = await addProfileComment(userId, comment)
      setComments([{ id, ...comment, timestamp: { toDate: () => new Date() } }, ...comments])
      setNewComment('')
    } catch (err) {
      console.error('Error adding comment:', err)
    }
    setSubmittingComment(false)
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteProfileComment(userId, commentId)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  // Date utilities
  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    return { daysInMonth, firstDayOfMonth }
  }

  const getWorkoutDates = () => {
    const dates = new Set()
    profile?.workouts?.forEach(exercise => {
      if (exercise.date) dates.add(exercise.date)
    })
    return dates
  }

  const getSelectedDayExercises = () => {
    const dateKey = formatDateKey(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    )
    return profile?.workouts?.filter(ex => ex.date === dateKey) || []
  }

  const getSelectedDayMeals = () => {
    const dateKey = formatDateKey(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    )
    return profile?.nutrition?.filter(meal => meal.date === dateKey) || []
  }

  const getWeeklyStats = () => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const exercises = profile?.workouts || []
    const meals = profile?.nutrition || []

    const weekExercises = exercises.filter(ex => {
      const exDate = new Date(ex.date)
      return exDate >= weekAgo && exDate <= today
    })

    const weekMeals = meals.filter(meal => {
      const mealDate = new Date(meal.date)
      return mealDate >= weekAgo && mealDate <= today
    })

    const workoutDays = new Set(weekExercises.map(ex => ex.date)).size
    const totalExercises = weekExercises.length
    const totalVolume = weekExercises.reduce((sum, ex) => sum + (ex.reps * ex.resistance), 0)
    const avgCalories = weekMeals.length > 0 
      ? Math.round(weekMeals.reduce((sum, meal) => sum + meal.calories, 0) / 7)
      : 0

    return { workoutDays, totalExercises, totalVolume, avgCalories }
  }

  const getPersonalRecords = () => {
    const recordsByExercise = {}
    const exercises = profile?.workouts || []
    
    exercises.forEach(ex => {
      const key = ex.name.toLowerCase()
      if (!recordsByExercise[key] || ex.resistance > recordsByExercise[key].resistance) {
        recordsByExercise[key] = {
          name: ex.name,
          resistance: ex.resistance,
          reps: ex.reps,
          date: ex.date
        }
      }
    })

    return Object.values(recordsByExercise)
      .sort((a, b) => b.resistance - a.resistance)
      .slice(0, 5)
  }

  const getWeightProgress = () => {
    const weighIns = profile?.weighIns || []
    const targetWeight = profile?.settings?.targetWeight ? parseFloat(profile.settings.targetWeight) : null
    
    if (!targetWeight || weighIns.length === 0) return null
    
    const sorted = [...weighIns].sort((a, b) => new Date(a.date) - new Date(b.date))
    const startWeight = sorted[0].weight
    const currentWeight = sorted[sorted.length - 1].weight
    
    const isCutting = targetWeight < startWeight
    const remaining = Math.abs(targetWeight - currentWeight)
    
    let progress = 0
    const totalChange = Math.abs(targetWeight - startWeight)
    if (totalChange > 0) {
      if (isCutting) {
        progress = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100
      } else {
        progress = ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100
      }
    }
    
    progress = Math.max(0, Math.min(100, progress))
    
    return {
      currentWeight,
      targetWeight,
      startWeight,
      remaining,
      progress,
      goalReached: isCutting ? currentWeight <= targetWeight : currentWeight >= targetWeight,
      isCutting
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
  }

  const isToday = (day) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    )
  }

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-profile-page">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate)
  const workoutDates = getWorkoutDates()
  const selectedDayExercises = getSelectedDayExercises()
  const selectedDayMeals = getSelectedDayMeals()
  const weeklyStats = getWeeklyStats()
  const personalRecords = getPersonalRecords()
  const weightProgress = getWeightProgress()
  const weightUnit = profile?.settings?.weightUnit || 'lbs'

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const renderCalendarDays = () => {
    const days = []
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
      const hasWorkout = workoutDates.has(dateKey)
      
      days.push(
        <button
          key={day}
          className={`calendar-day ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''} ${hasWorkout ? 'has-workout' : ''}`}
          onClick={() => handleDayClick(day)}
        >
          <span className="day-number">{day}</span>
          {hasWorkout && <span className="workout-indicator"></span>}
        </button>
      )
    }
    
    return days
  }

  const selectedDayNutritionTotals = selectedDayMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + (meal.protein || 0),
      carbs: totals.carbs + (meal.carbs || 0),
      fat: totals.fat + (meal.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div className="user-profile-page">
      <button className="back-btn" onClick={onBack}>← Back to Social</button>
      
      {/* Profile Header */}
      <div className="profile-header-card">
        <div className="profile-avatar large">
          {getInitials(profile.displayName)}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{profile.displayName}</h2>
          <p className="profile-subtitle">Fitness Journey</p>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`profile-tab ${activeTab === 'workouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('workouts')}
        >
          💪 Workouts
        </button>
        <button 
          className={`profile-tab ${activeTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveTab('nutrition')}
        >
          🍽️ Nutrition
        </button>
        <button 
          className={`profile-tab ${activeTab === 'weight' ? 'active' : ''}`}
          onClick={() => setActiveTab('weight')}
        >
          ⚖️ Weight
        </button>
        <button 
          className={`profile-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          💬 Comments ({comments.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="profile-content">
          {/* Weekly Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-icon">💪</span>
              <div className="stat-info">
                <span className="stat-value">{weeklyStats.workoutDays}</span>
                <span className="stat-label">Workouts This Week</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🏋️</span>
              <div className="stat-info">
                <span className="stat-value">{weeklyStats.totalVolume.toLocaleString()}</span>
                <span className="stat-label">Total Volume (lbs)</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🍽️</span>
              <div className="stat-info">
                <span className="stat-value">{weeklyStats.avgCalories}</span>
                <span className="stat-label">Avg Daily Calories</span>
              </div>
            </div>
          </div>

          {/* Weight Progress */}
          {weightProgress && (
            <div className="weight-progress-card">
              <div className="weight-progress-header">
                <span className="weight-icon">⚖️</span>
                <h3 className="weight-title">
                  {weightProgress.goalReached 
                    ? '🎉 Goal Reached!' 
                    : `${weightProgress.isCutting ? 'Cutting' : 'Bulking'} Progress`}
                </h3>
              </div>
              <div className="weight-progress-content">
                <div className="weight-stats">
                  <div className="weight-stat">
                    <span className="weight-stat-value">{weightProgress.currentWeight}</span>
                    <span className="weight-stat-label">Current ({weightUnit})</span>
                  </div>
                  <div className="weight-stat target">
                    <span className="weight-stat-value">{weightProgress.targetWeight}</span>
                    <span className="weight-stat-label">Target ({weightUnit})</span>
                  </div>
                  <div className="weight-stat">
                    <span className="weight-stat-value">{weightProgress.remaining.toFixed(1)}</span>
                    <span className="weight-stat-label">To Go ({weightUnit})</span>
                  </div>
                </div>
                <div className="weight-progress-bar">
                  <div 
                    className={`weight-progress-fill ${weightProgress.goalReached ? 'complete' : ''}`}
                    style={{ width: `${weightProgress.progress}%` }}
                  ></div>
                </div>
                <span className="weight-progress-percent">{Math.round(weightProgress.progress)}% complete</span>
              </div>
            </div>
          )}

          {/* Personal Records */}
          {personalRecords.length > 0 && (
            <div className="records-section">
              <h3 className="section-title">🏆 Personal Records</h3>
              <div className="records-grid">
                {personalRecords.map((record, i) => (
                  <div key={i} className="record-card">
                    <span className="record-rank">#{i + 1}</span>
                    <div className="record-info">
                      <span className="record-name">{record.name}</span>
                      <span className="record-weight">{record.resistance} lbs × {record.reps} reps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="profile-content">
          <div className="dashboard-content">
            {/* Calendar */}
            <div className="calendar-container">
              <div className="calendar-header">
                <button className="nav-arrow" onClick={handlePrevMonth}>‹</button>
                <h3 className="current-month">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button className="nav-arrow" onClick={handleNextMonth}>›</button>
              </div>
              
              <div className="calendar-grid">
                {dayNames.map(day => (
                  <div key={day} className="calendar-day-name">{day}</div>
                ))}
                {renderCalendarDays()}
              </div>
              
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-dot has-workout"></span>
                  <span>Workout logged</span>
                </div>
              </div>
            </div>
            
            {/* Day Details */}
            <div className="day-details">
              <h3 className="details-title">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              
              <div className="detail-section">
                <h4 className="detail-section-title">Workouts</h4>
                {selectedDayExercises.length === 0 ? (
                  <p className="no-data">No exercises logged</p>
                ) : (
                  <div className="exercise-list">
                    {selectedDayExercises.map(exercise => (
                      <div key={exercise.id} className="exercise-item">
                        <span className="exercise-name">{exercise.name}</span>
                        <div className="exercise-stats">
                          <span>{exercise.reps} reps</span>
                          <span>•</span>
                          <span>{exercise.resistance} lbs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nutrition Tab */}
      {activeTab === 'nutrition' && (
        <div className="profile-content">
          <div className="dashboard-content">
            {/* Calendar */}
            <div className="calendar-container">
              <div className="calendar-header">
                <button className="nav-arrow" onClick={handlePrevMonth}>‹</button>
                <h3 className="current-month">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button className="nav-arrow" onClick={handleNextMonth}>›</button>
              </div>
              
              <div className="calendar-grid">
                {dayNames.map(day => (
                  <div key={day} className="calendar-day-name">{day}</div>
                ))}
                {renderCalendarDays()}
              </div>
            </div>
            
            {/* Day Details */}
            <div className="day-details">
              <h3 className="details-title">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              
              <div className="detail-section">
                <h4 className="detail-section-title">Nutrition</h4>
                {selectedDayMeals.length === 0 ? (
                  <p className="no-data">No meals logged</p>
                ) : (
                  <>
                    <div className="nutrition-totals">
                      <span className="macro calories">{selectedDayNutritionTotals.calories} cal</span>
                      <span className="macro protein">{selectedDayNutritionTotals.protein}g P</span>
                      <span className="macro carbs">{selectedDayNutritionTotals.carbs}g C</span>
                      <span className="macro fat">{selectedDayNutritionTotals.fat}g F</span>
                    </div>
                    <div className="meal-list">
                      {selectedDayMeals.map(meal => (
                        <div key={meal.id} className="meal-item">
                          <span className="meal-name">{meal.name}</span>
                          <span className="meal-calories">{meal.calories} cal</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weight Tab */}
      {activeTab === 'weight' && (
        <div className="profile-content">
          {profile.weighIns && profile.weighIns.length > 0 ? (
            <div className="weight-history">
              <h3 className="section-title">Weight History</h3>
              <div className="weighins-list">
                {profile.weighIns.slice(0, 20).map(weighIn => (
                  <div key={weighIn.id} className="weighin-item">
                    <span className="weighin-date">{weighIn.date}</span>
                    <span className="weighin-weight">{weighIn.weight} {weightUnit}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">⚖️</span>
              <p>No weigh-ins recorded yet</p>
            </div>
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="profile-content">
          {/* Add Comment Form */}
          {currentUser && currentUser.uid !== userId && (
            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                placeholder={`Leave a comment for ${profile.displayName}...`}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <button 
                type="submit" 
                className="submit-comment-btn"
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          )}

          {/* Comments List */}
          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">💬</span>
                <p>No comments yet. Be the first to leave one!</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <div className="comment-avatar">
                      {getInitials(comment.authorName)}
                    </div>
                    <div className="comment-meta">
                      <span className="comment-author">{comment.authorName}</span>
                      <span className="comment-time">{formatTimestamp(comment.timestamp)}</span>
                    </div>
                    {currentUser && currentUser.uid === comment.authorId && (
                      <button 
                        className="delete-comment-btn"
                        onClick={() => handleDeleteComment(comment.id)}
                        aria-label="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfile
