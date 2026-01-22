import { useState, useEffect, useRef } from 'react'
import './WeighIns.css'
import { useAuth } from '../contexts/AuthContext'
import { getWeighIns, addWeighIn, deleteWeighIn, getUserSettings, updateUserSettings } from '../firebase/firestoreService'

function WeighIns() {
  const { currentUser } = useAuth()
  const [weighIns, setWeighIns] = useState([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [weighInDate, setWeighInDate] = useState(new Date().toISOString().split('T')[0])
  const [isPrivate, setIsPrivate] = useState(true)
  const [weightUnit, setWeightUnit] = useState('lbs')
  const [targetWeight, setTargetWeight] = useState(null)
  const [startWeight, setStartWeight] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          const [weighInData, settings] = await Promise.all([
            getWeighIns(currentUser.uid),
            getUserSettings(currentUser.uid)
          ])
          setWeighIns(weighInData)
          if (settings) {
            setIsPrivate(settings.weightPrivate !== false) // Default to private
            setWeightUnit(settings.weightUnit || 'lbs')
            setTargetWeight(settings.targetWeight ? parseFloat(settings.targetWeight) : null)
          }
          // Set start weight from oldest weigh-in
          if (weighInData.length > 0) {
            const sorted = [...weighInData].sort((a, b) => new Date(a.date) - new Date(b.date))
            setStartWeight(sorted[0].weight)
          }
        } catch (error) {
          console.error('Error loading weigh-ins:', error)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [currentUser])

  // Draw the chart whenever weighIns changes
  useEffect(() => {
    if (weighIns.length > 0 && canvasRef.current) {
      drawChart()
    }
  }, [weighIns])

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Sort data by date (oldest first for the chart)
    const sortedData = [...weighIns].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA - dateB
    })

    // Only show last 30 entries for readability
    const chartData = sortedData.slice(-30)

    if (chartData.length < 2) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Add at least 2 weigh-ins to see the chart', rect.width / 2, rect.height / 2)
      return
    }

    const padding = { top: 30, right: 20, bottom: 50, left: 60 }
    const chartWidth = rect.width - padding.left - padding.right
    const chartHeight = rect.height - padding.top - padding.bottom

    // Get min/max weights with some padding
    const weights = chartData.map(w => w.weight)
    const minWeight = Math.min(...weights) - 2
    const maxWeight = Math.max(...weights) + 2

    // Scale functions
    const xScale = (i) => padding.left + (i / (chartData.length - 1)) * chartWidth
    const yScale = (w) => padding.top + chartHeight - ((w - minWeight) / (maxWeight - minWeight)) * chartHeight

    // Get theme colors
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#646cff'
    const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#666'
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#333'

    // Draw grid lines
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 0.5
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(rect.width - padding.right, y)
      ctx.stroke()

      // Y-axis labels
      const weightLabel = maxWeight - (i / gridLines) * (maxWeight - minWeight)
      ctx.fillStyle = textMuted
      ctx.font = '12px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(weightLabel.toFixed(1), padding.left - 10, y + 4)
    }

    // Draw the line
    ctx.beginPath()
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    chartData.forEach((entry, i) => {
      const x = xScale(i)
      const y = yScale(entry.weight)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw gradient fill under line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, `${accentColor}40`)
    gradient.addColorStop(1, `${accentColor}05`)

    ctx.beginPath()
    chartData.forEach((entry, i) => {
      const x = xScale(i)
      const y = yScale(entry.weight)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.lineTo(xScale(chartData.length - 1), padding.top + chartHeight)
    ctx.lineTo(xScale(0), padding.top + chartHeight)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw data points
    chartData.forEach((entry, i) => {
      const x = xScale(i)
      const y = yScale(entry.weight)

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = accentColor
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw X-axis labels (show first, last, and middle dates)
    ctx.fillStyle = textMuted
    ctx.font = '11px system-ui'
    ctx.textAlign = 'center'

    const labelIndices = [0, Math.floor(chartData.length / 2), chartData.length - 1]
    labelIndices.forEach(i => {
      if (i < chartData.length) {
        const x = xScale(i)
        const date = new Date(chartData[i].date)
        const label = `${date.getMonth() + 1}/${date.getDate()}`
        ctx.fillText(label, x, rect.height - padding.bottom + 20)
      }
    })

    // Title
    ctx.fillStyle = textMuted
    ctx.font = '12px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`Weight (${weightUnit})`, padding.left, 15)
  }

  const handleAddWeighIn = async (e) => {
    e.preventDefault()

    if (!weight) return

    const selectedDate = new Date(weighInDate + 'T12:00:00')
    const newWeighIn = {
      weight: parseFloat(weight),
      unit: weightUnit,
      note: note.trim(),
      date: weighInDate,
      localTimestamp: selectedDate.toLocaleString(),
      isPrivate
    }

    try {
      const id = await addWeighIn(currentUser.uid, newWeighIn)
      const updatedWeighIns = [{ id, ...newWeighIn, timestamp: { toDate: () => selectedDate } }, ...weighIns]
      // Sort by date descending
      updatedWeighIns.sort((a, b) => new Date(b.date) - new Date(a.date))
      setWeighIns(updatedWeighIns)
      setWeight('')
      setNote('')
      setWeighInDate(new Date().toISOString().split('T')[0])
    } catch (error) {
      console.error('Error adding weigh-in:', error)
    }
  }

  const handleDeleteWeighIn = async (id) => {
    try {
      await deleteWeighIn(currentUser.uid, id)
      setWeighIns(weighIns.filter(w => w.id !== id))
    } catch (error) {
      console.error('Error deleting weigh-in:', error)
    }
  }

  const handlePrivacyChange = async (value) => {
    setIsPrivate(value)
    try {
      await updateUserSettings(currentUser.uid, { weightPrivate: value })
    } catch (error) {
      console.error('Error saving privacy setting:', error)
    }
  }

  const getWeightTrend = () => {
    if (weighIns.length < 2) return null

    const sorted = [...weighIns].sort((a, b) => new Date(b.date) - new Date(a.date))
    const recent = sorted.slice(0, 7) // Last 7 weigh-ins
    
    if (recent.length < 2) return null

    const avgRecent = recent.reduce((sum, w) => sum + w.weight, 0) / recent.length
    const oldest = recent[recent.length - 1].weight
    const diff = avgRecent - oldest

    if (Math.abs(diff) < 0.5) return { trend: 'stable', diff: 0 }
    return { trend: diff > 0 ? 'up' : 'down', diff: diff.toFixed(1) }
  }

  const getWeightProgress = () => {
    if (!targetWeight || weighIns.length === 0) return null
    
    const sorted = [...weighIns].sort((a, b) => new Date(b.date) - new Date(a.date))
    const currentWeight = sorted[0].weight
    const start = startWeight || currentWeight
    
    // Auto-detect if cutting or bulking based on target vs start
    const isCutting = targetWeight < start
    const remaining = Math.abs(targetWeight - currentWeight)
    
    // Calculate progress percentage
    let progress = 0
    const totalChange = Math.abs(targetWeight - start)
    if (totalChange > 0) {
      if (isCutting) {
        progress = ((start - currentWeight) / (start - targetWeight)) * 100
      } else {
        progress = ((currentWeight - start) / (targetWeight - start)) * 100
      }
    }
    
    // Clamp progress between 0 and 100
    progress = Math.max(0, Math.min(100, progress))
    
    // Check if goal is reached
    const goalReached = isCutting 
      ? currentWeight <= targetWeight
      : currentWeight >= targetWeight

    return {
      currentWeight,
      targetWeight,
      startWeight: start,
      remaining,
      progress,
      goalReached,
      isCutting
    }
  }

  const trend = getWeightTrend()
  const weightProgress = getWeightProgress()

  if (loading) {
    return <div className="weighins-page"><p>Loading...</p></div>
  }

  return (
    <div className="weighins-page">
      <h2 className="weighins-title">Weight Tracking</h2>

      {/* Privacy Toggle */}
      <div className="privacy-section">
        <div className="privacy-toggle">
          <button
            className={`toggle-btn ${isPrivate ? 'private' : 'public'}`}
            onClick={() => handlePrivacyChange(!isPrivate)}
          >
            <span className="toggle-slider"></span>
          </button>
          <span className="privacy-label">
            {isPrivate ? '🔒 Private' : '👁️ Public'}
          </span>
        </div>
      </div>

      {/* Weight Progress Section */}
      {weightProgress && targetWeight && (
        <div className="progress-section">
          <h3 className="section-title">
            {weightProgress.goalReached ? '🎉 Goal Reached!' : `Progress to Goal`}
          </h3>
          <div className="progress-stats">
            <div className="progress-stat">
              <span className="stat-label">Current</span>
              <span className="stat-value">{weightProgress.currentWeight} {weightUnit}</span>
            </div>
            <div className="progress-stat">
              <span className="stat-label">Target</span>
              <span className="stat-value target">{weightProgress.targetWeight} {weightUnit}</span>
            </div>
            <div className="progress-stat">
              <span className="stat-label">Remaining</span>
              <span className="stat-value">{weightProgress.remaining.toFixed(1)} {weightUnit}</span>
            </div>
          </div>
          <div className="progress-bar-container">
            <div 
              className={`progress-bar ${weightProgress.goalReached ? 'complete' : ''}`}
              style={{ width: `${weightProgress.progress}%` }}
            ></div>
          </div>
          <p className="progress-percent">{Math.round(weightProgress.progress)}% complete</p>
        </div>
      )}

      {/* Chart Section */}
      <div className="chart-section">
        <h3 className="section-title">Weight Over Time</h3>
        {trend && (
          <div className={`trend-indicator ${trend.trend}`}>
            {trend.trend === 'up' && `↗️ Trending up ${trend.diff} ${weightUnit}`}
            {trend.trend === 'down' && `↘️ Trending down ${Math.abs(trend.diff)} ${weightUnit}`}
            {trend.trend === 'stable' && '➡️ Weight stable'}
          </div>
        )}
        <div className="chart-container">
          <canvas ref={canvasRef} className="weight-chart"></canvas>
        </div>
      </div>

      {/* Add Weigh-In Form */}
      <form className="weighin-form" onSubmit={handleAddWeighIn}>
        <h3 className="section-title">Log Weigh-In</h3>
        <div className="form-row three-cols">
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
            <label htmlFor="weight">Weight ({weightUnit})</label>
            <input
              type="number"
              id="weight"
              placeholder={weightUnit === 'lbs' ? '175' : '80'}
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="note">Note (optional)</label>
            <input
              type="text"
              id="note"
              placeholder="e.g., After workout, Morning..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="add-btn">
          Add Weigh-In
        </button>
      </form>

      {/* Weigh-In History */}
      <div className="weighin-history">
        <h3 className="section-title">Recent Weigh-Ins</h3>
        {weighIns.length === 0 ? (
          <p className="empty-message">No weigh-ins logged yet. Start tracking your weight!</p>
        ) : (
          <div className="weighin-list">
            {weighIns.slice(0, 10).map((entry) => (
              <div key={entry.id} className="weighin-entry">
                <div className="weighin-main">
                  <span className="weighin-weight">{entry.weight} {entry.unit || weightUnit}</span>
                  <span className="weighin-date">
                    {entry.localTimestamp || (entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleDateString() : entry.date)}
                  </span>
                </div>
                {entry.note && <p className="weighin-note">{entry.note}</p>}
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteWeighIn(entry.id)}
                  aria-label="Delete weigh-in"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WeighIns
