import { useState, useEffect } from 'react'
import './WeighIns.css'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getWeighIns, addWeighIn, deleteWeighIn } from '../firebase/firestoreService'

function WeighIns() {
  const { currentUser } = useAuth()
  const showToast = useToast()
  const [weighIns, setWeighIns] = useState([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [weighInDate, setWeighInDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return
      try {
        const data = await getWeighIns(currentUser.uid)
        setWeighIns(data)
      } catch (err) {
        console.error('Error loading weigh-ins:', err)
      }
      setLoading(false)
    }
    loadData()
  }, [currentUser])

  const handleAddWeighIn = async (e) => {
    e.preventDefault()
    if (!weight) return
    const selectedDate = new Date(weighInDate + 'T12:00:00')
    const entry = {
      weight: parseFloat(weight),
      unit: 'lbs',
      note: note.trim(),
      date: weighInDate,
      localTimestamp: selectedDate.toLocaleString(),
      isPrivate: true,
    }
    try {
      const id = await addWeighIn(currentUser.uid, entry)
      const updated = [{ id, ...entry, timestamp: { toDate: () => selectedDate } }, ...weighIns]
      updated.sort((a, b) => new Date(b.date) - new Date(a.date))
      setWeighIns(updated)
      setWeight(''); setNote('')
      setWeighInDate(new Date().toISOString().split('T')[0])
    } catch (err) {
      console.error('Error adding weigh-in:', err)
      showToast('Could not save weigh-in. Try again.', 'error')
    }
  }

  const handleDeleteWeighIn = async (id) => {
    try {
      await deleteWeighIn(currentUser.uid, id)
      setWeighIns(weighIns.filter(w => w.id !== id))
    } catch (err) {
      console.error('Error deleting weigh-in:', err)
      showToast('Could not delete weigh-in.', 'error')
    }
  }

  if (loading) return <div className="weighins-page"><p className="muted">Loading…</p></div>

  const sorted = [...weighIns].sort((a, b) => new Date(b.date) - new Date(a.date))
  const latest = sorted[0]
  const prev = sorted[1]
  const delta = latest && prev ? +(latest.weight - prev.weight).toFixed(1) : null

  // Label for the hero card — reflects the latest entry's actual date rather
  // than always claiming "today".
  const heroLabel = (() => {
    if (!latest) return ''
    const today = new Date().toISOString().split('T')[0]
    const y = new Date(); y.setDate(y.getDate() - 1)
    const yesterday = y.toISOString().split('T')[0]
    if (latest.date === today) return 'TODAY'
    if (latest.date === yesterday) return 'YESTERDAY'
    return new Date(latest.date + 'T12:00')
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      .toUpperCase()
  })()

  // 30-day delta
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recent = sorted.filter(w => new Date(w.date) >= thirtyDaysAgo)
  const monthDelta = recent.length > 1
    ? +(recent[0].weight - recent[recent.length - 1].weight).toFixed(1)
    : null

  // Chart points (last 30 days, sorted ascending)
  const chartPoints = [...recent].sort((a, b) => new Date(a.date) - new Date(b.date)).map(w => w.weight)
  const min = chartPoints.length ? Math.min(...chartPoints) : 0
  const max = chartPoints.length ? Math.max(...chartPoints) : 1
  const range = max - min || 1
  const W = 280, H = 60
  const step = chartPoints.length > 1 ? W / (chartPoints.length - 1) : W
  const path = chartPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${i * step} ${H - ((p - min) / range) * H * 0.85 - H * 0.075}`
  ).join(' ')

  // Quick nudge buttons
  const nudge = (delta) => {
    const base = latest?.weight || 0
    setWeight((base + delta).toFixed(1))
  }

  return (
    <div className="weighins-page">
      <div className="hy-sub-label" style={{ padding: '4px 0 12px' }}>OCCASIONAL CHECK-IN</div>

      {/* Hero number card */}
      {latest && (
        <div className="hy-card accent weigh-hero">
          <span className="hy-sub-label" style={{ color: 'var(--accent-primary)' }}>{heroLabel}</span>
          <div className="weigh-number hy-numeric">{latest.weight}</div>
          <div className="weigh-unit mono">{latest.unit || 'lbs'} {delta !== null && (
            <span style={{ color: delta < 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
              · {delta > 0 ? '+' : ''}{delta}
            </span>
          )}</div>
          <div className="weigh-nudges">
            {[-0.2, -0.1, 0.1, 0.2].map(d => (
              <button key={d} type="button" className="hy-pill" onClick={() => nudge(d)}>
                {d > 0 ? '+' : ''}{d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trend chart */}
      {chartPoints.length > 1 && (
        <div className="hy-card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700 }}>Last 30 days</span>
            {monthDelta !== null && (
              <span className="hy-numeric" style={{ fontSize: 13, color: monthDelta < 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {monthDelta < 0 ? '↓' : '↑'} {Math.abs(monthDelta)} lbs
              </span>
            )}
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            <path d={`${path} L ${(chartPoints.length - 1) * step} ${H} L 0 ${H} Z`} fill="var(--accent-primary)" opacity="0.12" />
            <path d={path} stroke="var(--accent-primary)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {chartPoints.map((p, i) => (
              <circle key={i} cx={i * step} cy={H - ((p - min) / range) * H * 0.85 - H * 0.075} r="2" fill="var(--accent-primary)" />
            ))}
          </svg>
          <div className="weigh-axis">
            <span>30d ago</span><span>today</span>
          </div>
        </div>
      )}

      {/* Add weigh-in form */}
      <form className="weighin-form" onSubmit={handleAddWeighIn} style={{ marginTop: 12 }}>
        <div className="hy-section-label" style={{ marginBottom: 8 }}>New entry</div>
        <div className="weigh-form-row">
          <div className="form-group">
            <label htmlFor="weighin-date">Date</label>
            <input
              type="date"
              id="weighin-date"
              value={weighInDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setWeighInDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="weight">Weight (lbs)</label>
            <input
              type="number"
              id="weight"
              placeholder="175"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="note">Note (optional)</label>
          <input
            type="text"
            id="note"
            placeholder="e.g., morning, after workout…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button type="submit" className="add-btn">Save weigh-in</button>
      </form>

      {/* Log history */}
      <div className="hy-section-label" style={{ marginTop: 18, marginBottom: 8 }}>Log</div>
      {weighIns.length === 0 ? (
        <div className="hy-card dashed" style={{ padding: '24px 16px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No weigh-ins yet.</span>
        </div>
      ) : (
        <div className="weigh-log">
          {sorted.slice(0, 12).map((entry, i) => {
            const next = sorted[i + 1]
            const d = next ? +(entry.weight - next.weight).toFixed(1) : null
            return (
              <div key={entry.id} className={`hy-card weigh-row ${i % 2 ? 'tilt-r-sm' : 'tilt-l-sm'}`}>
                <span className="weigh-row-date">{new Date(entry.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <div className="weigh-row-right">
                  {d !== null && (
                    <span className="mono" style={{ fontSize: 11, color: d < 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {d > 0 ? '+' : ''}{d}
                    </span>
                  )}
                  <span className="hy-numeric weigh-row-value">{entry.weight}</span>
                  <button className="delete-btn" onClick={() => handleDeleteWeighIn(entry.id)} aria-label="Delete">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WeighIns
