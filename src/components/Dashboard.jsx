import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [exercises, setExercises] = useState([])
  const [meals, setMeals] = useState([])
  const [settings, setSettings] = useState({
    calorieGoal: 2000,
    proteinGoal: 150,
    workoutDaysGoal: 4
  })

  useEffect(() => {
    const savedWorkouts = localStorage.getItem('workouts')
    const savedNutrition = localStorage.getItem('nutrition')
    const savedSettings = localStorage.getItem('fitnessSettings')
    if (savedWorkouts) {
      setExercises(JSON.parse(savedWorkouts))
    }
    if (savedNutrition) {
      setMeals(JSON.parse(savedNutrition))
    }
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))
    }
  }, [])

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
    const totalVolume = weekExercises.reduce((sum, ex) => sum + (ex.reps * ex.resistance), 0)
    const avgCalories = weekMeals.length > 0 
      ? Math.round(weekMeals.reduce((sum, meal) => sum + meal.calories, 0) / 7)
      : 0
    const avgProtein = weekMeals.length > 0
      ? Math.round(weekMeals.reduce((sum, meal) => sum + meal.protein, 0) / 7)
      : 0

    return { workoutDays, totalExercises, totalVolume, avgCalories, avgProtein }
  }

  // Personal records
  const getPersonalRecords = () => {
    const recordsByExercise = {}
    
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

  // Last 30 days activity for chart
  const getLast30DaysActivity = () => {
    const days = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
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

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate)
  const workoutDates = getWorkoutDates()
  const selectedDayExercises = getSelectedDayExercises()
  const selectedDayMeals = getSelectedDayMeals()
  const weeklyStats = getWeeklyStats()
  const personalRecords = getPersonalRecords()
  const streak = getStreak()
  const last30Days = getLast30DaysActivity()
  const maxCalories = Math.max(...last30Days.map(d => d.calories), 1)

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

      {/* Activity Chart */}
      <div className="activity-section">
        <h3 className="section-title">30-Day Activity</h3>
        <div className="activity-chart">
          <div className="chart-bars">
            {last30Days.map((day, i) => (
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
            <span>30 days ago</span>
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
                  <span className="record-weight">{record.resistance} lbs × {record.reps} reps</span>
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
    </div>
  )
}

export default Dashboard
