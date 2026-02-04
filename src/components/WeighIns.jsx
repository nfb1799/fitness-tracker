import { useState, useEffect } from 'react'
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

  const weightProgress = getWeightProgress()

  if (loading) {
    return <div className="weighins-page"><p>Loading...</p></div>
  }

  return (
    <div className="weighins-page">
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
