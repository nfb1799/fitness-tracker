import { useState, useEffect } from 'react'
import './Goals.css'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getUserSettings, updateUserSettings, getWeighIns } from '../firebase/firestoreService'

function Goals() {
  const { currentUser } = useAuth()
  const showToast = useToast()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [weighIns, setWeighIns] = useState([])
  const [form, setForm] = useState({
    calorieGoal: 2000,
    proteinGoal: 150,
    workoutDaysGoal: 4,
    targetWeight: '',
    targetDate: '',
  })

  useEffect(() => {
    if (!currentUser) return
    const load = async () => {
      try {
        const [settings, wi] = await Promise.all([
          getUserSettings(currentUser.uid),
          getWeighIns(currentUser.uid),
        ])
        if (settings) setForm(prev => ({ ...prev, ...settings }))
        setWeighIns(wi)
      } catch (err) {
        console.error('Error loading goals:', err)
      }
      setLoading(false)
    }
    load()
  }, [currentUser])

  if (loading) return <div className="goals-page"><p className="muted">Loading…</p></div>

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    try {
      await updateUserSettings(currentUser.uid, form)
      setEditing(false)
      showToast('Goals saved', 'success')
    } catch (err) {
      console.error('Error saving goals:', err)
      showToast('Could not save goals. Try again.', 'error')
    }
  }

  // Progress on the main weight goal
  let progressPct = null, progressLine = null
  const target = parseFloat(form.targetWeight)
  if (target && weighIns.length > 0) {
    const sorted = [...weighIns].sort((a, b) => new Date(a.date) - new Date(b.date))
    const start = sorted[0].weight
    const current = sorted[sorted.length - 1].weight
    const isCutting = target < start
    const totalChange = Math.abs(target - start)
    if (totalChange > 0) {
      const made = isCutting ? (start - current) : (current - start)
      progressPct = Math.max(0, Math.min(100, (made / totalChange) * 100))
      progressLine = `${Math.abs(made).toFixed(1)} / ${totalChange.toFixed(1)} lbs`
    }
  }

  return (
    <div className="goals-page">
      <div className="hy-screen-header" style={{ padding: '4px 0 14px' }}>
        <div>
          <div className="hy-sub-label">WHAT YOU'RE AIMING AT</div>
        </div>
        {editing ? (
          <button className="h-action" onClick={handleSave}>Save</button>
        ) : (
          <button className="h-action-ghost" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {/* Main goal */}
      <div className="hy-card accent tilt-l-sm goal-main">
        <div className="goal-main-grid">
          <div>
            <span className="hy-sub-label" style={{ color: 'var(--accent-primary)' }}>MAIN GOAL</span>
            {editing ? (
              <div className="goal-edit-row">
                <input
                  type="number"
                  placeholder="168"
                  step="0.1"
                  value={form.targetWeight}
                  onChange={(e) => handleChange('targetWeight', e.target.value)}
                  className="goal-input"
                />
                <span className="mono goal-unit">lbs</span>
              </div>
            ) : (
              <div className="goal-title">
                {form.targetWeight ? `Reach ${form.targetWeight} lbs` : 'Set a target weight'}
              </div>
            )}
            {editing ? (
              <input
                type="date"
                value={form.targetDate || ''}
                onChange={(e) => handleChange('targetDate', e.target.value)}
                className="goal-date-input"
              />
            ) : (
              form.targetDate && (
                <div className="goal-by mono">by {new Date(form.targetDate + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              )
            )}
          </div>
          {progressPct !== null && (
            <div className="goal-progress-stats">
              <div className="hy-numeric goal-pct">{Math.round(progressPct)}%</div>
              <div className="mono goal-progress-line">{progressLine}</div>
            </div>
          )}
        </div>
        {progressPct !== null && (
          <div className="hy-bar" style={{ marginTop: 14, height: 8 }}>
            <div className="fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Daily targets */}
      <div className="hy-section-label" style={{ marginTop: 22, marginBottom: 10 }}>Daily</div>
      <div className="goals-list">
        <GoalRow
          tilt="r"
          label="Calories"
          sub="kcal target"
          value={form.calorieGoal}
          unit=""
          editing={editing}
          onChange={(v) => handleChange('calorieGoal', parseInt(v) || 0)}
        />
        {form.trackMacros && (
          <GoalRow
            tilt="l"
            label="Protein"
            sub="grams/day"
            value={form.proteinGoal}
            unit="g"
            editing={editing}
            onChange={(v) => handleChange('proteinGoal', parseInt(v) || 0)}
          />
        )}
      </div>

      {/* Weekly targets */}
      <div className="hy-section-label" style={{ marginTop: 22, marginBottom: 10 }}>Weekly</div>
      <div className="goals-list">
        <GoalRow
          tilt="l"
          label="Workouts"
          sub="days per week"
          value={form.workoutDaysGoal}
          unit="×"
          editing={editing}
          onChange={(v) => handleChange('workoutDaysGoal', parseInt(v) || 0)}
        />
      </div>

      {editing && (
        <button className="add-btn" style={{ marginTop: 18 }} onClick={handleSave}>
          Save goals
        </button>
      )}
    </div>
  )
}

function GoalRow({ tilt, label, sub, value, unit, editing, onChange }) {
  return (
    <div className={`hy-card goal-row ${tilt === 'l' ? 'tilt-l-sm' : 'tilt-r-sm'}`}>
      <div>
        <div className="goal-row-label">{label}</div>
        <div className="goal-row-sub mono">{sub}</div>
      </div>
      {editing ? (
        <div className="goal-edit-row">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="goal-input small"
          />
          {unit && <span className="mono goal-unit">{unit}</span>}
        </div>
      ) : (
        <span className="hy-numeric goal-row-value">
          {(typeof value === 'number' ? value.toLocaleString() : value)}{unit && ` ${unit}`}
        </span>
      )}
    </div>
  )
}

export default Goals
