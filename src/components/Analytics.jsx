import { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import './Analytics.css'
import { useAuth } from '../contexts/AuthContext'
import { getWorkouts, getNutrition, getWeighIns, getUserSettings } from '../firebase/firestoreService'

// Helper to get local date string
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to format date for display
const formatDate = (dateStr, short = false) => {
  const date = new Date(dateStr + 'T00:00:00')
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Time range options
const TIME_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '180d', label: '6 Months' },
  { value: '365d', label: '1 Year' },
  { value: 'all', label: 'All Time' },
]

// Chart colors
const COLORS = {
  primary: '#646cff',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b',
  protein: '#8b5cf6',
  carbs: '#f59e0b',
  fat: '#ef4444',
}

function Analytics() {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('workouts')
  const [timeRange, setTimeRange] = useState('30d')
  const [workouts, setWorkouts] = useState([])
  const [nutrition, setNutrition] = useState([])
  const [weighIns, setWeighIns] = useState([])
  const [settings, setSettings] = useState({ calorieGoal: 2000, proteinGoal: 150 })
  const [selectedExercise, setSelectedExercise] = useState('')

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          const [workoutData, nutritionData, weighInData, userSettings] = await Promise.all([
            getWorkouts(currentUser.uid),
            getNutrition(currentUser.uid),
            getWeighIns(currentUser.uid),
            getUserSettings(currentUser.uid)
          ])
          setWorkouts(workoutData)
          setNutrition(nutritionData)
          setWeighIns(weighInData)
          if (userSettings) {
            setSettings(prev => ({ ...prev, ...userSettings }))
          }
        } catch (error) {
          console.error('Error loading analytics data:', error)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [currentUser])

  // Calculate date range
  const dateRange = useMemo(() => {
    const today = new Date()
    let startDate = new Date()
    
    if (timeRange === 'all') {
      startDate = new Date('2020-01-01')
    } else {
      const days = parseInt(timeRange)
      startDate.setDate(today.getDate() - days)
    }
    
    return {
      start: getLocalDateString(startDate),
      end: getLocalDateString(today)
    }
  }, [timeRange])

  // Filter data by date range
  const filteredWorkouts = useMemo(() => {
    return workouts.filter(w => w.date >= dateRange.start && w.date <= dateRange.end)
  }, [workouts, dateRange])

  const filteredNutrition = useMemo(() => {
    return nutrition.filter(n => n.date >= dateRange.start && n.date <= dateRange.end)
  }, [nutrition, dateRange])

  const filteredWeighIns = useMemo(() => {
    return weighIns.filter(w => w.date >= dateRange.start && w.date <= dateRange.end)
  }, [weighIns, dateRange])

  // Get unique exercise names
  const exerciseNames = useMemo(() => {
    const names = [...new Set(filteredWorkouts.map(w => w.name))]
    return names.sort()
  }, [filteredWorkouts])

  // Set default selected exercise
  useEffect(() => {
    if (exerciseNames.length > 0 && !selectedExercise) {
      setSelectedExercise(exerciseNames[0])
    }
  }, [exerciseNames, selectedExercise])

  // Workout analytics
  const workoutStats = useMemo(() => {
    const byDate = {}
    const byExercise = {}
    
    filteredWorkouts.forEach(w => {
      byDate[w.date] = (byDate[w.date] || 0) + 1
      
      if (!byExercise[w.name]) {
        byExercise[w.name] = []
      }
      byExercise[w.name].push(w)
    })

    // Calculate exercise progress data for charts
    const exerciseProgress = {}
    Object.entries(byExercise).forEach(([name, exercises]) => {
      exerciseProgress[name] = exercises
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(ex => {
          let totalVolume = 0
          let maxWeight = 0
          const sets = ex.sets || 1
          const reps = Array.isArray(ex.reps) ? ex.reps : [ex.reps || 0]
          const weights = Array.isArray(ex.measurementValue) ? ex.measurementValue : [ex.measurementValue || 0]
          
          for (let i = 0; i < sets; i++) {
            const rep = reps[i] || reps[0] || 0
            const weight = weights[i] || weights[0] || 0
            totalVolume += rep * weight
            if (weight > maxWeight) maxWeight = weight
          }
          
          return {
            date: ex.date,
            dateFormatted: formatDate(ex.date, true),
            volume: totalVolume,
            maxWeight,
            sets,
            totalReps: reps.reduce((a, b) => a + b, 0)
          }
        })
    })

    const totalDays = Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1
    const daysWithWorkouts = Object.keys(byDate).length
    const frequency = totalDays > 0 ? (daysWithWorkouts / totalDays * 7).toFixed(1) : 0

    return {
      byDate,
      exerciseProgress,
      totalWorkouts: filteredWorkouts.length,
      uniqueExercises: Object.keys(byExercise).length,
      daysWithWorkouts,
      frequency
    }
  }, [filteredWorkouts, dateRange])

  // Nutrition analytics
  const nutritionStats = useMemo(() => {
    const byDate = {}
    
    filteredNutrition.forEach(meal => {
      if (!byDate[meal.date]) {
        byDate[meal.date] = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
      }
      byDate[meal.date].calories += meal.calories || 0
      byDate[meal.date].protein += meal.protein || 0
      byDate[meal.date].carbs += meal.carbs || 0
      byDate[meal.date].fat += meal.fat || 0
      byDate[meal.date].meals += 1
    })

    const days = Object.keys(byDate).sort()
    const dailyData = days.map(date => ({
      date,
      dateFormatted: formatDate(date, true),
      ...byDate[date],
      calorieGoal: settings.calorieGoal,
      proteinGoal: settings.proteinGoal
    }))

    const totals = dailyData.reduce((acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    const numDays = dailyData.length || 1
    
    // Macro pie chart data
    const avgProtein = Math.round(totals.protein / numDays)
    const avgCarbs = Math.round(totals.carbs / numDays)
    const avgFat = Math.round(totals.fat / numDays)
    const proteinCal = avgProtein * 4
    const carbsCal = avgCarbs * 4
    const fatCal = avgFat * 9
    const totalCal = proteinCal + carbsCal + fatCal || 1

    const macroData = [
      { name: 'Protein', value: avgProtein, calories: proteinCal, percent: Math.round((proteinCal / totalCal) * 100), color: COLORS.protein },
      { name: 'Carbs', value: avgCarbs, calories: carbsCal, percent: Math.round((carbsCal / totalCal) * 100), color: COLORS.carbs },
      { name: 'Fat', value: avgFat, calories: fatCal, percent: Math.round((fatCal / totalCal) * 100), color: COLORS.fat },
    ]

    return {
      dailyData,
      macroData,
      averages: {
        calories: Math.round(totals.calories / numDays),
        protein: avgProtein,
        carbs: avgCarbs,
        fat: avgFat
      },
      daysLogged: numDays,
      daysAtCalorieGoal: dailyData.filter(d => d.calories >= settings.calorieGoal * 0.9 && d.calories <= settings.calorieGoal * 1.1).length,
      daysAtProteinGoal: dailyData.filter(d => d.protein >= settings.proteinGoal).length
    }
  }, [filteredNutrition, settings])

  // Weight progress
  const weightStats = useMemo(() => {
    const sorted = [...filteredWeighIns].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length === 0) return null

    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const change = last.weight - first.weight
    const avgWeight = sorted.reduce((sum, w) => sum + w.weight, 0) / sorted.length

    // Format data for chart
    const chartData = sorted.map(w => ({
      date: w.date,
      dateFormatted: formatDate(w.date, true),
      weight: w.weight
    }))

    return {
      data: chartData,
      startWeight: first.weight,
      currentWeight: last.weight,
      change,
      avgWeight: avgWeight.toFixed(1),
      entries: sorted.length
    }
  }, [filteredWeighIns])

  if (loading) {
    return <div className="analytics-page"><p>Loading analytics...</p></div>
  }

  return (
    <div className="analytics-page">
      {/* Controls */}
      <div className="analytics-controls">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'workouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('workouts')}
          >
            💪 Workouts
          </button>
          <button
            className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
            onClick={() => setActiveTab('nutrition')}
          >
            🍎 Nutrition
          </button>
          <button
            className={`tab-btn ${activeTab === 'weight' ? 'active' : ''}`}
            onClick={() => setActiveTab('weight')}
          >
            ⚖️ Weight
          </button>
        </div>

        <div className="time-range-selector">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="analytics-section">
          {/* Summary Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-value">{workoutStats.totalWorkouts}</span>
              <span className="stat-label">Total Exercises</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{workoutStats.daysWithWorkouts}</span>
              <span className="stat-label">Days Active</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{workoutStats.frequency}</span>
              <span className="stat-label">Days/Week</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{workoutStats.uniqueExercises}</span>
              <span className="stat-label">Unique Exercises</span>
            </div>
          </div>

          {/* Exercise Progress Chart */}
          {exerciseNames.length > 0 && (
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Exercise Progress</h3>
                <select 
                  value={selectedExercise} 
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="exercise-selector"
                >
                  {exerciseNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              
              {workoutStats.exerciseProgress[selectedExercise]?.length > 0 ? (
                <>
                  {/* Exercise Stats - Above Chart */}
                  <div className="exercise-stats above-chart">
                    {(() => {
                      const data = workoutStats.exerciseProgress[selectedExercise]
                      const latest = data[data.length - 1]
                      const first = data[0]
                      const maxWeight = Math.max(...data.map(d => d.maxWeight))
                      const progress = latest.maxWeight - first.maxWeight
                      
                      return (
                        <>
                          <div className="exercise-stat">
                            <span className="stat-label">Current Max</span>
                            <span className="stat-value">{latest.maxWeight} lbs</span>
                          </div>
                          <div className="exercise-stat">
                            <span className="stat-label">All-Time Max</span>
                            <span className="stat-value">{maxWeight} lbs</span>
                          </div>
                          <div className="exercise-stat">
                            <span className="stat-label">Progress</span>
                            <span className={`stat-value ${progress >= 0 ? 'positive' : 'negative'}`}>
                              {progress >= 0 ? '+' : ''}{progress} lbs
                            </span>
                          </div>
                          <div className="exercise-stat">
                            <span className="stat-label">Sessions</span>
                            <span className="stat-value">{data.length}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={workoutStats.exerciseProgress[selectedExercise]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis 
                          dataKey="dateFormatted" 
                          stroke="var(--text-muted)"
                          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                          tickLine={{ stroke: 'var(--border-color)' }}
                        />
                        <YAxis 
                          stroke="var(--text-muted)"
                          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                          tickLine={{ stroke: 'var(--border-color)' }}
                          label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                          domain={['dataMin - 10', 'dataMax + 10']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--bg-secondary)', 
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                          }}
                          labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                          formatter={(value) => [`${value} lbs`, 'Max Weight']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="maxWeight" 
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: COLORS.primary }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="no-data">No data available for this exercise</p>
              )}
            </div>
          )}

          {exerciseNames.length === 0 && (
            <div className="no-data-container">
              <p className="no-data">No workout data available for this time range.</p>
              <p className="no-data-hint">Log workouts to see your progress here.</p>
            </div>
          )}
        </div>
      )}

      {/* Nutrition Tab */}
      {activeTab === 'nutrition' && (
        <div className="analytics-section">
          {/* Summary Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-value">{nutritionStats.averages.calories}</span>
              <span className="stat-label">Avg Calories</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{nutritionStats.averages.protein}g</span>
              <span className="stat-label">Avg Protein</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{nutritionStats.daysLogged}</span>
              <span className="stat-label">Days Logged</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{nutritionStats.daysAtProteinGoal}</span>
              <span className="stat-label">Days Hit Protein</span>
            </div>
          </div>

          {nutritionStats.dailyData.length > 0 ? (
            <>
              {/* Calories Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Daily Calories</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={nutritionStats.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="dateFormatted" 
                      stroke="var(--text-muted)"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="var(--text-muted)"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      label={{ value: 'Calories', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value) => [`${value} cal`, 'Calories']}
                    />
                    <ReferenceLine y={settings.calorieGoal} stroke={COLORS.success} strokeDasharray="5 5" label={{ value: 'Goal', fill: COLORS.success, fontSize: 12 }} />
                    <Bar dataKey="calories" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Protein Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Daily Protein</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={nutritionStats.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="dateFormatted" 
                      stroke="var(--text-muted)"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="var(--text-muted)"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      label={{ value: 'Protein (g)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value) => [`${value}g`, 'Protein']}
                    />
                    <ReferenceLine y={settings.proteinGoal} stroke={COLORS.success} strokeDasharray="5 5" label={{ value: 'Goal', fill: COLORS.success, fontSize: 12 }} />
                    <Bar dataKey="protein" fill={COLORS.protein} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Macro Distribution Pie Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Average Macro Distribution</h3>
                <div className="macro-chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={nutritionStats.macroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="calories"
                        label={({ name, percent }) => `${name} ${percent}%`}
                        labelLine={{ stroke: 'var(--text-muted)' }}
                      >
                        {nutritionStats.macroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                        formatter={(value, name, props) => [`${props.payload.value}g (${value} cal)`, props.payload.name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="macro-legend">
                    {nutritionStats.macroData.map((macro, index) => (
                      <div key={index} className="macro-legend-item">
                        <span className="macro-dot" style={{ backgroundColor: macro.color }}></span>
                        <span>{macro.name}: {macro.value}g ({macro.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data-container">
              <p className="no-data">No nutrition data available for this time range.</p>
              <p className="no-data-hint">Log meals to see your nutrition analytics here.</p>
            </div>
          )}
        </div>
      )}

      {/* Weight Tab */}
      {activeTab === 'weight' && (
        <div className="analytics-section">
          {weightStats ? (
            <>
              {/* Summary Cards */}
              <div className="stats-cards">
                <div className="stat-card">
                  <span className="stat-value">{weightStats.currentWeight} lbs</span>
                  <span className="stat-label">Current</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{weightStats.startWeight} lbs</span>
                  <span className="stat-label">Starting</span>
                </div>
                <div className="stat-card">
                  <span className={`stat-value ${weightStats.change <= 0 ? 'positive' : 'negative'}`}>
                    {weightStats.change > 0 ? '+' : ''}{weightStats.change.toFixed(1)} lbs
                  </span>
                  <span className="stat-label">Change</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{weightStats.entries}</span>
                  <span className="stat-label">Weigh-Ins</span>
                </div>
              </div>

              {/* Weight Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Weight Progress</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={weightStats.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="dateFormatted" 
                      stroke="var(--text-muted)"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="var(--text-muted)"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                      label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value) => [`${value} lbs`, 'Weight']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      stroke={COLORS.secondary}
                      strokeWidth={2}
                      fill="url(#weightGradient)"
                      dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: COLORS.secondary }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="no-data-container">
              <p className="no-data">No weigh-in data available for this time range.</p>
              <p className="no-data-hint">Log your weight in the Weigh-Ins section to see progress here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Analytics
