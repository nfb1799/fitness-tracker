import { useState, useEffect } from 'react'
import './Workouts.css'
import { useAuth } from '../contexts/AuthContext'
import { getWorkouts, addWorkout, deleteWorkout } from '../firebase/firestoreService'

const MEASUREMENT_TYPES = [
  { value: 'resistance', label: 'Weight', unit: 'lbs', placeholder: '135' },
  { value: 'assistance', label: 'Assistance', unit: 'lbs', placeholder: '30' },
  { value: 'time', label: 'Time', unit: '', placeholder: '' },
  { value: 'distance', label: 'Distance', unit: 'miles', placeholder: '1.5' },
  { value: 'bodyweight', label: 'Bodyweight', unit: '', placeholder: '' },
]

// Helper to format time from total seconds
const formatTimeDisplay = (totalSeconds) => {
  if (!totalSeconds && totalSeconds !== 0) return ''
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}

function Workouts() {
  const { currentUser } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [measurementType, setMeasurementType] = useState('resistance')
  const [measurementValue, setMeasurementValue] = useState('')
  // Time-specific state
  const [timeHours, setTimeHours] = useState('')
  const [timeMinutes, setTimeMinutes] = useState('')
  const [timeSeconds, setTimeSeconds] = useState('')

  const currentMeasurement = MEASUREMENT_TYPES.find(m => m.value === measurementType)

  // Calculate total seconds from time inputs
  const getTotalSeconds = () => {
    const h = parseInt(timeHours) || 0
    const m = parseInt(timeMinutes) || 0
    const s = parseInt(timeSeconds) || 0
    return h * 3600 + m * 60 + s
  }

  useEffect(() => {
    const loadWorkouts = async () => {
      if (currentUser) {
        try {
          const workouts = await getWorkouts(currentUser.uid)
          setExercises(workouts)
        } catch (error) {
          console.error('Error loading workouts:', error)
        }
      }
      setLoading(false)
    }
    loadWorkouts()
  }, [currentUser])

  const handleAddExercise = async (e) => {
    e.preventDefault()
    
    // Validate based on measurement type
    const needsValue = measurementType !== 'bodyweight' && measurementType !== 'time'
    const needsTime = measurementType === 'time'
    const needsSetsReps = measurementType !== 'time'
    const totalSeconds = getTotalSeconds()
    
    if (!exerciseName.trim()) {
      return
    }
    if (needsSetsReps && (!sets || !reps)) {
      return
    }
    if (needsValue && !measurementValue) {
      return
    }
    if (needsTime && totalSeconds === 0) {
      return
    }

    let finalValue = null
    let finalUnit = currentMeasurement.unit
    
    if (measurementType === 'time') {
      finalValue = totalSeconds
      finalUnit = 'seconds'
    } else if (needsValue) {
      finalValue = parseFloat(measurementValue)
    }

    const newExercise = {
      name: exerciseName.trim(),
      sets: needsSetsReps ? parseInt(sets) : null,
      reps: needsSetsReps ? parseInt(reps) : null,
      measurementType,
      measurementValue: finalValue,
      measurementUnit: finalUnit,
      date: new Date().toISOString().split('T')[0],
      localTimestamp: new Date().toLocaleString()
    }

    try {
      const id = await addWorkout(currentUser.uid, newExercise)
      setExercises([{ id, ...newExercise, timestamp: { toDate: () => new Date() } }, ...exercises])
      setExerciseName('')
      setSets('')
      setReps('')
      setMeasurementValue('')
      setTimeHours('')
      setTimeMinutes('')
      setTimeSeconds('')
    } catch (error) {
      console.error('Error adding workout:', error)
    }
  }

  const handleDeleteExercise = async (id) => {
    try {
      await deleteWorkout(currentUser.uid, id)
      setExercises(exercises.filter(exercise => exercise.id !== id))
    } catch (error) {
      console.error('Error deleting workout:', error)
    }
  }

  if (loading) {
    return <div className="workouts-page"><p>Loading...</p></div>
  }

  return (
    <div className="workouts-page">
      <h2 className="workouts-title">Log Your Workout</h2>
      
      <form className="workout-form" onSubmit={handleAddExercise}>
        <div className="form-group">
          <label htmlFor="exercise-name">Exercise Name</label>
          <input
            type="text"
            id="exercise-name"
            placeholder="e.g., Bench Press, Squats..."
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
          />
        </div>
        
        <div className="form-row three-cols">
          <div className="form-group">
            <label htmlFor="measurement-type">Measurement Type</label>
            <select
              id="measurement-type"
              value={measurementType}
              onChange={(e) => {
                setMeasurementType(e.target.value)
                setMeasurementValue('')
              }}
              className="measurement-select"
            >
              {MEASUREMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="sets">Sets</label>
            <input
              type="number"
              id="sets"
              placeholder={measurementType === 'time' ? '-' : '3'}
              min="1"
              value={measurementType === 'time' ? '' : sets}
              onChange={(e) => setSets(e.target.value)}
              disabled={measurementType === 'time'}
              className={measurementType === 'time' ? 'input-disabled' : ''}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="reps">Reps</label>
            <input
              type="number"
              id="reps"
              placeholder={measurementType === 'time' ? '-' : '10'}
              min="1"
              value={measurementType === 'time' ? '' : reps}
              onChange={(e) => setReps(e.target.value)}
              disabled={measurementType === 'time'}
              className={measurementType === 'time' ? 'input-disabled' : ''}
            />
          </div>
        </div>
        
        {measurementType === 'time' && (
          <div className="form-group">
            <label>Duration</label>
            <div className="time-inputs">
              <div className="time-input-group">
                <input
                  type="number"
                  id="time-hours"
                  placeholder="0"
                  min="0"
                  max="99"
                  value={timeHours}
                  onChange={(e) => setTimeHours(e.target.value)}
                />
                <span className="time-label">hrs</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  id="time-minutes"
                  placeholder="0"
                  min="0"
                  max="59"
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(e.target.value)}
                />
                <span className="time-label">min</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  id="time-seconds"
                  placeholder="0"
                  min="0"
                  max="59"
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(e.target.value)}
                />
                <span className="time-label">sec</span>
              </div>
            </div>
          </div>
        )}
        
        {measurementType !== 'bodyweight' && measurementType !== 'time' && (
          <div className="form-group">
            <label htmlFor="measurement-value">
              {currentMeasurement.label} {currentMeasurement.unit && `(${currentMeasurement.unit})`}
            </label>
            <input
              type="number"
              id="measurement-value"
              placeholder={currentMeasurement.placeholder}
              min="0"
              step={measurementType === 'distance' ? '0.1' : '0.5'}
              value={measurementValue}
              onChange={(e) => setMeasurementValue(e.target.value)}
            />
          </div>
        )}
        
        <button type="submit" className="add-btn">
          Add Exercise
        </button>
      </form>

      <div className="exercises-list">
        <h3 className="list-title">Today's Exercises</h3>
        
        {(() => {
          const today = new Date().toISOString().split('T')[0]
          const todaysExercises = exercises.filter(ex => ex.date === today)
          
          return todaysExercises.length === 0 ? (
            <p className="empty-message">No exercises logged yet. Start adding your workout!</p>
          ) : (
            <div className="exercises-grid">
              {todaysExercises.map((exercise) => (
                <div key={exercise.id} className="exercise-card">
                  <div className="exercise-header">
                    <h4 className="exercise-name">{exercise.name}</h4>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteExercise(exercise.id)}
                      aria-label="Delete exercise"
                    >
                      ×
                    </button>
                  </div>
                  <div className="exercise-details">
                    {/* Show Sets only if not a time-based exercise */}
                    {exercise.measurementType !== 'time' && exercise.sets && (
                      <div className="detail">
                        <span className="detail-label">Sets</span>
                        <span className="detail-value">{exercise.sets}</span>
                      </div>
                    )}
                    
                    {/* Show Reps only if not a time-based exercise */}
                    {exercise.measurementType !== 'time' && exercise.reps && (
                      <div className="detail">
                        <span className="detail-label">Reps</span>
                        <span className="detail-value">{exercise.reps}</span>
                      </div>
                    )}
                    
                    {/* Show Duration for time-based exercises */}
                    {exercise.measurementType === 'time' && (
                      <div className="detail">
                        <span className="detail-label">Duration</span>
                        <span className="detail-value">{formatTimeDisplay(exercise.measurementValue)}</span>
                      </div>
                    )}
                    
                    {/* Show Weight for resistance exercises */}
                    {(exercise.measurementType === 'resistance' || (!exercise.measurementType && exercise.resistance)) && (
                      <div className="detail">
                        <span className="detail-label">Weight</span>
                        <span className="detail-value">
                          {exercise.measurementValue !== undefined && exercise.measurementValue !== null
                            ? `${exercise.measurementValue} ${exercise.measurementUnit || 'lbs'}`
                            : `${exercise.resistance} lbs`}
                        </span>
                      </div>
                    )}
                    
                    {/* Show Assistance for assisted exercises */}
                    {exercise.measurementType === 'assistance' && (
                      <div className="detail">
                        <span className="detail-label">Assistance</span>
                        <span className="detail-value">-{exercise.measurementValue} {exercise.measurementUnit || 'lbs'}</span>
                      </div>
                    )}
                    
                    {/* Show Distance for distance exercises */}
                    {exercise.measurementType === 'distance' && (
                      <div className="detail">
                        <span className="detail-label">Distance</span>
                        <span className="detail-value">{exercise.measurementValue} {exercise.measurementUnit || 'miles'}</span>
                      </div>
                    )}
                    
                    {/* Show Bodyweight indicator */}
                    {exercise.measurementType === 'bodyweight' && (
                      <div className="detail">
                        <span className="detail-label">Type</span>
                        <span className="detail-value bodyweight-badge">Bodyweight</span>
                      </div>
                    )}
                  </div>
                  <span className="exercise-time">{exercise.localTimestamp || (exercise.timestamp?.toDate ? exercise.timestamp.toDate().toLocaleString() : '')}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default Workouts
