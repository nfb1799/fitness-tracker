import { useState, useEffect } from 'react'
import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { getWorkouts, getNutrition, getUserSettings, getWeighIns, getProfileComments, addProfileComment, deleteProfileComment } from '../firebase/firestoreService'

function Dashboard() {
  const { currentUser } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [exercises, setExercises] = useState([])
  const [meals, setMeals] = useState([])
  const [weighIns, setWeighIns] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [activityDays, setActivityDays] = useState(7)
  const [settings, setSettings] = useState({
    calorieGoal: 2000,
    proteinGoal: 150,
    workoutDaysGoal: 4,
    targetWeight: null,
    weightUnit: 'lbs'
  })

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          const [workoutsData, nutritionData, userSettings, weighInsData, commentsData] = await Promise.all([
            getWorkouts(currentUser.uid),
            getNutrition(currentUser.uid),
            getUserSettings(currentUser.uid),
            getWeighIns(currentUser.uid),
            getProfileComments(currentUser.uid)
          ])
          setExercises(workoutsData)
          setMeals(nutritionData)
          setWeighIns(weighInsData)
          setComments(commentsData)
          if (userSettings) {
            setSettings(prev => ({ ...prev, ...userSettings }))
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [currentUser])

  // Date utilities
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    return { daysInMonth, firstDayOfMonth }
  }

  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getWorkoutDates = () => {
    const dates = new Set()
    exercises.forEach(exercise => {
      if (exercise.date) {
        dates.add(exercise.date)
      }
    })
    return dates
  }

  const getSelectedDayExercises = () => {
    const dateKey = formatDateKey(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    )
    return exercises.filter(ex => ex.date === dateKey)
  }

  const getSelectedDayMeals = () => {
    const dateKey = formatDateKey(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    )
    return meals.filter(meal => meal.date === dateKey)
  }

  // Weekly stats calculations
  const getWeeklyStats = () => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
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
    
    // Fix total volume calculation to handle arrays and different measurement types
    const totalVolume = weekExercises.reduce((sum, ex) => {
      // Only calculate volume for resistance exercises
      if (ex.measurementType !== 'resistance' && ex.measurementType !== undefined && ex.measurementType !== 'assistance') {
        return sum
      }
      
      const reps = Array.isArray(ex.reps) ? ex.reps : (ex.reps ? [ex.reps] : [0])
      const weights = Array.isArray(ex.measurementValue) 
        ? ex.measurementValue 
        : (ex.measurementValue ? Array(reps.length).fill(ex.measurementValue) : (ex.resistance ? Array(reps.length).fill(ex.resistance) : [0]))
      
      // Sum up reps * weight for each set
      let exerciseVolume = 0
      for (let i = 0; i < reps.length; i++) {
        const setReps = parseInt(reps[i]) || 0
        const setWeight = parseFloat(weights[i] || weights[0]) || 0
        exerciseVolume += setReps * setWeight
      }
      return sum + exerciseVolume
    }, 0)
    
    // Fix average calories - only count days that have entries
    const daysWithMeals = new Set(weekMeals.map(meal => meal.date)).size
    const avgCalories = daysWithMeals > 0 
      ? Math.round(weekMeals.reduce((sum, meal) => sum + meal.calories, 0) / daysWithMeals)
      : 0
    const avgProtein = daysWithMeals > 0
      ? Math.round(weekMeals.reduce((sum, meal) => sum + meal.protein, 0) / daysWithMeals)
      : 0

    return { workoutDays, totalExercises, totalVolume, avgCalories, avgProtein }
  }

  // Personal records
  const getPersonalRecords = () => {
    const recordsByExercise = {}
    
    exercises.forEach(ex => {
      // Only track PRs for resistance exercises
      if (ex.measurementType && ex.measurementType !== 'resistance') return
      
      const key = ex.name.toLowerCase()
      // Get the max weight from the exercise (could be array or single value)
      const maxWeight = Array.isArray(ex.measurementValue) 
        ? Math.max(...ex.measurementValue) 
        : (ex.measurementValue || ex.resistance || 0)
      
      const currentRecord = recordsByExercise[key]
      if (!currentRecord || maxWeight > currentRecord.weight) {
        recordsByExercise[key] = {
          name: ex.name,
          weight: maxWeight,
          unit: ex.measurementUnit || 'lbs',
          reps: Array.isArray(ex.reps) ? ex.reps[0] : ex.reps,
          date: ex.date
        }
      }
    })

    return Object.values(recordsByExercise)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
  }

  // Weight progress calculation
  const getWeightProgress = () => {
    const targetWeight = settings.targetWeight ? parseFloat(settings.targetWeight) : null
    
    if (!targetWeight || weighIns.length === 0) return null
    
    const sorted = [...weighIns].sort((a, b) => new Date(a.date) - new Date(b.date))
    const startWeight = sorted[0].weight
    const currentWeight = sorted[sorted.length - 1].weight
    
    // Auto-detect if cutting or bulking based on target vs start
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
    
    const goalReached = isCutting 
      ? currentWeight <= targetWeight
      : currentWeight >= targetWeight

    return {
      currentWeight,
      targetWeight,
      startWeight,
      remaining,
      progress,
      goalReached,
      isCutting
    }
  }

  // Streak calculation
  const getStreak = () => {
    const sortedDates = [...new Set(exercises.map(ex => ex.date))]
      .sort((a, b) => new Date(b) - new Date(a))
    
    if (sortedDates.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const checkKey = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate())
      
      if (sortedDates.includes(checkKey)) {
        streak++
      } else if (i === 0) {
        // Today doesn't have a workout, check if yesterday started a streak
        continue
      } else {
        break
      }
    }
    
    return streak
  }

  // Last N days activity for chart
  const getActivityData = (numDays) => {
    const days = []
    const today = new Date()
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())
      
      const dayExercises = exercises.filter(ex => ex.date === dateKey)
      const dayMeals = meals.filter(meal => meal.date === dateKey)
      
      days.push({
        date: dateKey,
        label: date.getDate(),
        exercises: dayExercises.length,
        calories: dayMeals.reduce((sum, meal) => sum + meal.calories, 0),
        hasWorkout: dayExercises.length > 0,
        hasMeals: dayMeals.length > 0
      })
    }
    
    return days
  }

  // Calendar navigation
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

  // Comment handlers
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const comment = {
        text: newComment.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email
      }
      const id = await addProfileComment(currentUser.uid, comment)
      setComments([{ id, ...comment, timestamp: { toDate: () => new Date() } }, ...comments])
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteProfileComment(currentUser.uid, commentId)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate)
  const workoutDates = getWorkoutDates()
  const selectedDayExercises = getSelectedDayExercises()
  const selectedDayMeals = getSelectedDayMeals()
  const weeklyStats = getWeeklyStats()
  const personalRecords = getPersonalRecords()
  const streak = getStreak()
  const activityData = getActivityData(activityDays)
  const maxCalories = Math.max(...activityData.map(d => d.calories), 1)
  const weightProgress = getWeightProgress()

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
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fat: totals.fat + meal.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  if (loading) {
    return <div className="dashboard-page"><p>Loading...</p></div>
  }

  return (
    <div className="dashboard-page">
      <h2 className="dashboard-title">Dashboard</h2>
      
      {/* Weekly Summary Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="stat-info">
            <span className="stat-value">{streak}</span>
            <span className="stat-label">Day Streak</span>
          </div>
        </div>
        <div className="stat-card has-progress">
          <span className="stat-icon">💪</span>
          <div className="stat-info">
            <span className="stat-value">{weeklyStats.workoutDays}<span className="stat-goal">/{settings.workoutDaysGoal}</span></span>
            <span className="stat-label">Workouts This Week</span>
            <div className="progress-bar">
              <div 
                className="progress-fill workout" 
                style={{ width: `${Math.min((weeklyStats.workoutDays / settings.workoutDaysGoal) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏋️</span>
          <div className="stat-info">
            <span className="stat-value">{weeklyStats.totalVolume.toLocaleString()}</span>
            <span className="stat-label">Total Volume (lbs)</span>
          </div>
        </div>
        <div className="stat-card has-progress">
          <span className="stat-icon">🍽️</span>
          <div className="stat-info">
            <span className="stat-value">{weeklyStats.avgCalories}<span className="stat-goal">/{settings.calorieGoal}</span></span>
            <span className="stat-label">Avg Daily Calories</span>
            <div className="progress-bar">
              <div 
                className="progress-fill calories" 
                style={{ width: `${Math.min((weeklyStats.avgCalories / settings.calorieGoal) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Progress Card */}
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
                <span className="weight-stat-label">Current ({settings.weightUnit})</span>
              </div>
              <div className="weight-stat target">
                <span className="weight-stat-value">{weightProgress.targetWeight}</span>
                <span className="weight-stat-label">Target ({settings.weightUnit})</span>
              </div>
              <div className="weight-stat">
                <span className="weight-stat-value">{weightProgress.remaining.toFixed(1)}</span>
                <span className="weight-stat-label">To Go ({settings.weightUnit})</span>
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

      {/* Activity Chart */}
      <div className="activity-section">
        <div className="activity-header">
          <h3 className="section-title">Activity</h3>
          <div className="activity-toggle">
            <button 
              className={`toggle-btn ${activityDays === 7 ? 'active' : ''}`}
              onClick={() => setActivityDays(7)}
            >
              7 Days
            </button>
            <button 
              className={`toggle-btn ${activityDays === 30 ? 'active' : ''}`}
              onClick={() => setActivityDays(30)}
            >
              30 Days
            </button>
          </div>
        </div>
        <div className="activity-chart">
          <div className="chart-bars">
            {activityData.map((day, i) => (
              <div key={i} className="chart-bar-container">
                <div 
                  className={`chart-bar ${day.hasWorkout ? 'has-workout' : ''}`}
                  style={{ height: `${Math.max((day.calories / maxCalories) * 100, day.hasWorkout ? 20 : 5)}%` }}
                  title={`${day.date}: ${day.calories} cal, ${day.exercises} exercises`}
                ></div>
              </div>
            ))}
          </div>
          <div className="chart-labels">
            <span>{activityDays} days ago</span>
            <span>Today</span>
          </div>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-bar has-workout"></span>
            <span>Workout day</span>
          </div>
          <div className="legend-item">
            <span className="legend-bar"></span>
            <span>Rest day</span>
          </div>
        </div>
      </div>

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
                  <span className="record-weight">{record.weight} {record.unit} × {record.reps} reps</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          
          {/* Workout Section */}
          <div className="detail-section">
            <h4 className="detail-section-title">Workouts</h4>
            {selectedDayExercises.length === 0 ? (
              <p className="no-data">No exercises logged</p>
            ) : (
              <div className="exercise-list">
                {selectedDayExercises.map(exercise => {
                  const reps = Array.isArray(exercise.reps) ? exercise.reps.join('/') : exercise.reps
                  const weight = Array.isArray(exercise.measurementValue) 
                    ? exercise.measurementValue.join('/') 
                    : (exercise.measurementValue || exercise.resistance || 0)
                  const unit = exercise.measurementUnit || 'lbs'
                  
                  return (
                    <div key={exercise.id} className="exercise-item">
                      <span className="exercise-name">{exercise.name}</span>
                      <div className="exercise-stats">
                        {exercise.measurementType !== 'time' && <span>{reps} reps</span>}
                        {exercise.measurementType === 'resistance' || !exercise.measurementType ? (
                          <>
                            <span>•</span>
                            <span>{weight} {unit}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nutrition Section */}
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

      {/* Profile Comments Section */}
      <div className="comments-section">
        <h3 className="section-title">💬 Profile Comments</h3>
        <form className="comment-form" onSubmit={handleAddComment}>
          <input
            type="text"
            placeholder="Leave a comment on your profile..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
          />
          <button type="submit" className="comment-submit-btn" disabled={!newComment.trim()}>
            Post
          </button>
        </form>
        <div className="comments-list">
          {comments.length === 0 ? (
            <p className="no-comments">No comments yet. Be the first to leave a note!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <span className="comment-author">{comment.authorName}</span>
                  <span className="comment-time">
                    {comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleDateString() : ''}
                  </span>
                  {comment.authorId === currentUser?.uid && (
                    <button
                      className="comment-delete-btn"
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
    </div>
  )
}

export default Dashboard
