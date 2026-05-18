import { useState, useEffect } from 'react'
import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import {
  getWorkouts, getNutrition, getUserSettings, getWeighIns
} from '../firebase/firestoreService'

const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function Dashboard() {
  const { currentUser } = useAuth()
  const [exercises, setExercises] = useState([])
  const [meals, setMeals] = useState([])
  const [weighIns, setWeighIns] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    calorieGoal: 2000,
    proteinGoal: 150,
    workoutDaysGoal: 4,
    targetWeight: null,
    weightUnit: 'lbs',
  })

  useEffect(() => {
    if (!currentUser) return
    const load = async () => {
      try {
        const [w, n, s, wi] = await Promise.all([
          getWorkouts(currentUser.uid),
          getNutrition(currentUser.uid),
          getUserSettings(currentUser.uid),
          getWeighIns(currentUser.uid),
        ])
        setExercises(w); setMeals(n); setWeighIns(wi)
        if (s) setSettings(prev => ({ ...prev, ...s }))
      } catch (err) {
        console.error('Error loading dashboard:', err)
      }
      setLoading(false)
    }
    load()
  }, [currentUser])

  if (loading) return <div className="dashboard-page"><p className="muted">Loading…</p></div>

  const todayKey = getLocalDateString()
  const todayMeals = meals.filter(m => m.date === todayKey)
  const todayExercises = exercises.filter(e => e.date === todayKey)

  const totals = todayMeals.reduce((t, m) => ({
    calories: t.calories + (m.calories || 0),
    protein:  t.protein  + (m.protein  || 0),
    carbs:    t.carbs    + (m.carbs    || 0),
    fat:      t.fat      + (m.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const calLeft = Math.max(0, settings.calorieGoal - totals.calories)
  const proteinPct = Math.min(1, totals.protein / settings.proteinGoal)

  // Streak (consecutive days w/ workout up to today)
  const wOnDate = new Set(exercises.map(e => e.date))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = getLocalDateString(d)
    if (wOnDate.has(k)) streak++
    else if (i > 0) break
  }

  // Build chronological entries for today (meals + workouts)
  const entries = []
  todayMeals.forEach(m => {
    const ts = m.timestamp?.toDate ? m.timestamp.toDate() : (m.localTimestamp ? new Date(m.localTimestamp) : null)
    entries.push({
      kind: 'meal',
      type: 'MEAL',
      time: ts ? ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '',
      name: m.name,
      value: `${m.calories}`,
      detail: `${m.protein||0}P · ${m.carbs||0}C · ${m.fat||0}F`,
      sortAt: ts ? ts.getTime() : 0,
    })
  })
  todayExercises.forEach(ex => {
    const reps = Array.isArray(ex.reps) ? ex.reps.join('·') : ex.reps
    const wt = Array.isArray(ex.measurementValue)
      ? Math.max(...ex.measurementValue)
      : (ex.measurementValue || ex.resistance || '')
    const unit = ex.measurementUnit || 'lb'
    entries.push({
      kind: 'workout',
      type: 'WORKOUT',
      time: '',
      name: ex.name,
      value: ex.measurementType === 'time'
        ? `${Math.round((ex.measurementValue || 0) / 60)}m`
        : (wt ? `${wt} ${unit}` : reps || ''),
      detail: ex.measurementType === 'resistance' || !ex.measurementType
        ? `${reps || 0} reps`
        : (ex.measurementType || ''),
      accent: true,
      sortAt: 0,
    })
  })
  entries.sort((a, b) => b.sortAt - a.sortAt)

  // Workout days this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
  const weekWorkoutDays = new Set(
    exercises.filter(e => new Date(e.date) >= weekAgo).map(e => e.date)
  ).size

  // Latest weigh-in
  const sortedWi = [...weighIns].sort((a, b) => new Date(b.date) - new Date(a.date))
  const latestWeight = sortedWi[0]?.weight

  const now = new Date()
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' })
  const dateLine = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="dashboard-page">
      <div className="hy-screen-header" style={{ padding: '4px 0 14px' }}>
        <div>
          <div className="hy-sub-label">{weekday.toUpperCase()} · {dateLine.toUpperCase()}</div>
        </div>
      </div>

      {/* Hero: today's calories + macros */}
      <div className="hy-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span className="hy-numeric" style={{ fontSize: 44, color: 'var(--text-primary)', lineHeight: 1 }}>
            {totals.calories.toLocaleString()}
          </span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            / {settings.calorieGoal.toLocaleString()} kcal · {calLeft.toLocaleString()} left
          </span>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="hy-row">
              <span className="hy-mini-label">Protein</span>
              <span className="mono hy-mini-value">{totals.protein} / {settings.proteinGoal}g</span>
            </div>
            <div className="hy-bar"><div className="fill" style={{ width: `${proteinPct * 100}%` }} /></div>
          </div>

          <div>
            <div className="hy-row">
              <span className="hy-mini-label">Workouts (this week)</span>
              <span className="mono hy-mini-value">{weekWorkoutDays} / {settings.workoutDaysGoal}</span>
            </div>
            <div className="hy-bar">
              <div className="fill neutral" style={{ width: `${Math.min(1, weekWorkoutDays / settings.workoutDaysGoal) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="quick-stats">
        <div className="hy-card quick-stat">
          <span className="hy-mini-label">Streak</span>
          <span className="hy-numeric quick-stat-value">{streak}</span>
          <span className="hy-mini-label">days</span>
        </div>
        <div className="hy-card quick-stat">
          <span className="hy-mini-label">Weight</span>
          <span className="hy-numeric quick-stat-value">{latestWeight ?? '—'}</span>
          <span className="hy-mini-label">{settings.weightUnit || 'lb'}</span>
        </div>
      </div>

      {/* Today's entries */}
      <div className="hy-section-row">
        <span className="hy-section-label">Today's entries</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-dimmed)' }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="hy-card dashed" style={{ padding: '24px 16px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Nothing logged yet. Tap + to add a meal or workout.
          </span>
        </div>
      ) : (
        <div className="entries-list">
          {entries.map((e, i) => (
            <div key={i} className={`hy-card entry-card ${i % 2 ? 'tilt-r-sm' : 'tilt-l-sm'} ${e.accent ? 'accent' : ''}`}>
              <div className="entry-head">
                <div>
                  <div className="entry-meta">
                    <span className="hy-sub-label" style={{ color: e.accent ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{e.type}</span>
                    {e.time && <span className="mono entry-time">· {e.time}</span>}
                  </div>
                  <div className="entry-name">{e.name}</div>
                </div>
                <span className="hy-numeric entry-value" style={{ color: e.accent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{e.value}</span>
              </div>
              <div className="entry-detail mono">{e.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
