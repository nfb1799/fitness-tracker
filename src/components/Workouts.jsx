import { useState, useEffect } from 'react'
import './Workouts.css'
import { useAuth } from '../contexts/AuthContext'
import { getWorkouts, addWorkout, deleteWorkout } from '../firebase/firestoreService'

function Workouts() {
  const { currentUser } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [exerciseName, setExerciseName] = useState('')
  const [reps, setReps] = useState('')
  const [resistance, setResistance] = useState('')

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
    
    if (!exerciseName.trim() || !reps || !resistance) {
      return
    }

    const newExercise = {
      name: exerciseName.trim(),
      reps: parseInt(reps),
      resistance: parseFloat(resistance),
      date: new Date().toISOString().split('T')[0],
      localTimestamp: new Date().toLocaleString()
    }

    try {
      const id = await addWorkout(currentUser.uid, newExercise)
      setExercises([{ id, ...newExercise, timestamp: { toDate: () => new Date() } }, ...exercises])
      setExerciseName('')
      setReps('')
      setResistance('')
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
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reps">Reps</label>
            <input
              type="number"
              id="reps"
              placeholder="10"
              min="1"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="resistance">Resistance (lbs)</label>
            <input
              type="number"
              id="resistance"
              placeholder="135"
              min="0"
              step="0.5"
              value={resistance}
              onChange={(e) => setResistance(e.target.value)}
            />
          </div>
        </div>
        
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
                  <div className="detail">
                    <span className="detail-label">Reps</span>
                    <span className="detail-value">{exercise.reps}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Weight</span>
                    <span className="detail-value">{exercise.resistance} lbs</span>
                  </div>
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
