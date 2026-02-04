import { useState, useEffect, useRef } from 'react'
import './Workouts.css'
import { useAuth } from '../contexts/AuthContext'
import { getWorkouts, addWorkout, deleteWorkout, updateWorkout, updateWorkoutsOrder } from '../firebase/firestoreService'

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

// Helper to get local date string (YYYY-MM-DD format)
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function Workouts() {
  const { currentUser } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState('')
  const [repsPerSet, setRepsPerSet] = useState([]) // Array to hold reps for each set
  const [weightsPerSet, setWeightsPerSet] = useState([]) // Array to hold weights for each set
  const [measurementType, setMeasurementType] = useState('resistance')
  const [measurementValue, setMeasurementValue] = useState('')
  // Time-specific state
  const [timeHours, setTimeHours] = useState('')
  const [timeMinutes, setTimeMinutes] = useState('')
  const [timeSeconds, setTimeSeconds] = useState('')
  
  // Edit mode state
  const [editingExercise, setEditingExercise] = useState(null)
  const [editForm, setEditForm] = useState({})
  
  // Drag and drop state
  const [draggedExercise, setDraggedExercise] = useState(null)
  const [dragOverExercise, setDragOverExercise] = useState(null)
  
  // Saved exercises for autocomplete
  const [savedExercises, setSavedExercises] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Copy workout modal state
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyFromDate, setCopyFromDate] = useState('')

  // Date input ref for calendar picker
  const dateInputRef = useRef(null)

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
          
          // Extract unique exercise templates (name + type + last used values)
          const exerciseMap = new Map()
          workouts.forEach(ex => {
            const key = ex.name?.toLowerCase()
            if (key && !exerciseMap.has(key)) {
              exerciseMap.set(key, {
                name: ex.name,
                measurementType: ex.measurementType,
                measurementValue: ex.measurementValue,
                measurementUnit: ex.measurementUnit,
                sets: ex.sets,
                reps: ex.reps
              })
            }
          })
          setSavedExercises(Array.from(exerciseMap.values()))
        } catch (error) {
          console.error('Error loading workouts:', error)
        }
      }
      setLoading(false)
    }
    loadWorkouts()
  }, [currentUser])

  // Update repsPerSet and weightsPerSet arrays when sets changes
  const handleSetsChange = (newSets) => {
    setSets(newSets)
    const numSets = parseInt(newSets) || 0
    if (numSets > 0) {
      setRepsPerSet(prev => {
        const newReps = [...prev]
        // Expand or shrink the array to match number of sets
        while (newReps.length < numSets) {
          newReps.push(prev[prev.length - 1] || '') // Copy last value or empty
        }
        return newReps.slice(0, numSets)
      })
      setWeightsPerSet(prev => {
        const newWeights = [...prev]
        while (newWeights.length < numSets) {
          newWeights.push(prev[prev.length - 1] || measurementValue || '') // Copy last value or current measurement value
        }
        return newWeights.slice(0, numSets)
      })
    } else {
      setRepsPerSet([])
      setWeightsPerSet([])
    }
  }

  // Update reps for a specific set
  const handleRepsChange = (index, value) => {
    setRepsPerSet(prev => {
      const newReps = [...prev]
      newReps[index] = value
      return newReps
    })
  }

  // Update weight for a specific set
  const handleWeightChange = (index, value) => {
    setWeightsPerSet(prev => {
      const newWeights = [...prev]
      newWeights[index] = value
      return newWeights
    })
  }

  const handleAddExercise = async (e) => {
    e.preventDefault()
    
    // Validate based on measurement type
    const needsValue = measurementType !== 'bodyweight' && measurementType !== 'time'
    const needsTime = measurementType === 'time'
    const needsSetsReps = measurementType !== 'time'
    const totalSeconds = getTotalSeconds()
    const numSets = parseInt(sets) || 0
    
    if (!exerciseName.trim()) {
      return
    }
    if (needsSetsReps && (!sets || numSets === 0)) {
      return
    }
    // Check that all sets have reps filled in
    if (needsSetsReps && (repsPerSet.length !== numSets || repsPerSet.some(r => !r || parseInt(r) <= 0))) {
      return
    }
    if (needsValue && !measurementValue && weightsPerSet.length === 0) {
      return
    }
    // If multiple sets, check that weights are filled in when needed
    if (needsValue && numSets > 1 && weightsPerSet.some(w => !w || parseFloat(w) <= 0)) {
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
      // Use weightsPerSet array if multiple sets, otherwise single value
      if (numSets > 1) {
        finalValue = weightsPerSet.map(w => parseFloat(w))
      } else {
        finalValue = parseFloat(measurementValue)
      }
    }

    // Convert repsPerSet to numbers
    const repsArray = repsPerSet.map(r => parseInt(r))

    const newExercise = {
      name: exerciseName.trim(),
      sets: needsSetsReps ? numSets : null,
      reps: needsSetsReps ? repsArray : null, // Now stores array of reps per set
      measurementType,
      measurementValue: finalValue,
      measurementUnit: finalUnit,
      date: selectedDate,
      localTimestamp: new Date().toLocaleString()
    }

    try {
      const id = await addWorkout(currentUser.uid, newExercise)
      setExercises([{ id, ...newExercise, timestamp: { toDate: () => new Date() } }, ...exercises])
      setExerciseName('')
      setSets('')
      setRepsPerSet([])
      setWeightsPerSet([])
      setMeasurementValue('')
      setTimeHours('')
      setTimeMinutes('')
      setTimeSeconds('')
      
      // Update saved exercises list with the new exercise if it's new
      const existingIndex = savedExercises.findIndex(
        ex => ex.name.toLowerCase() === exerciseName.trim().toLowerCase()
      )
      if (existingIndex === -1) {
        setSavedExercises(prev => [...prev, {
          name: exerciseName.trim(),
          measurementType,
          measurementValue: finalValue,
          measurementUnit: finalUnit,
          sets: needsSetsReps ? numSets : null,
          reps: needsSetsReps ? repsArray : null
        }])
      }
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

  // Edit exercise functions
  const startEditing = (exercise) => {
    const totalSeconds = exercise.measurementType === 'time' ? exercise.measurementValue || 0 : 0
    const isArrayValue = Array.isArray(exercise.measurementValue)
    setEditingExercise(exercise.id)
    setEditForm({
      name: exercise.name,
      sets: exercise.sets || '',
      repsPerSet: Array.isArray(exercise.reps) ? exercise.reps.map(String) : (exercise.reps ? [String(exercise.reps)] : []),
      weightsPerSet: isArrayValue ? exercise.measurementValue.map(String) : [],
      measurementType: exercise.measurementType || 'resistance',
      measurementValue: exercise.measurementType !== 'time' && !isArrayValue ? (exercise.measurementValue || '') : '',
      timeHours: Math.floor(totalSeconds / 3600) || '',
      timeMinutes: Math.floor((totalSeconds % 3600) / 60) || '',
      timeSeconds: totalSeconds % 60 || ''
    })
  }

  const cancelEditing = () => {
    setEditingExercise(null)
    setEditForm({})
  }

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value }
      
      // Handle sets change to resize repsPerSet and weightsPerSet arrays
      if (field === 'sets') {
        const numSets = parseInt(value) || 0
        const newReps = [...(prev.repsPerSet || [])]
        const newWeights = [...(prev.weightsPerSet || [])]
        while (newReps.length < numSets) {
          newReps.push(prev.repsPerSet?.[prev.repsPerSet.length - 1] || '')
        }
        while (newWeights.length < numSets) {
          newWeights.push(prev.weightsPerSet?.[prev.weightsPerSet.length - 1] || prev.measurementValue || '')
        }
        updated.repsPerSet = newReps.slice(0, numSets)
        updated.weightsPerSet = newWeights.slice(0, numSets)
      }
      
      return updated
    })
  }

  const handleEditRepsChange = (index, value) => {
    setEditForm(prev => {
      const newReps = [...(prev.repsPerSet || [])]
      newReps[index] = value
      return { ...prev, repsPerSet: newReps }
    })
  }

  const handleEditWeightChange = (index, value) => {
    setEditForm(prev => {
      const newWeights = [...(prev.weightsPerSet || [])]
      newWeights[index] = value
      return { ...prev, weightsPerSet: newWeights }
    })
  }

  const saveEdit = async () => {
    if (!editForm.name?.trim()) return

    const needsSetsReps = editForm.measurementType !== 'time'
    const needsValue = editForm.measurementType !== 'bodyweight' && editForm.measurementType !== 'time'
    const needsTime = editForm.measurementType === 'time'
    const isResistanceType = editForm.measurementType === 'resistance' || editForm.measurementType === 'assistance'
    
    const numSets = parseInt(editForm.sets) || 0
    const totalSeconds = (parseInt(editForm.timeHours) || 0) * 3600 + 
                         (parseInt(editForm.timeMinutes) || 0) * 60 + 
                         (parseInt(editForm.timeSeconds) || 0)

    // Validation
    if (needsSetsReps && numSets === 0) return
    if (needsSetsReps && (editForm.repsPerSet?.length !== numSets || editForm.repsPerSet.some(r => !r || parseInt(r) <= 0))) return
    // Only require measurementValue if single set, or weightsPerSet if multiple sets for resistance types
    if (needsValue && numSets <= 1 && !editForm.measurementValue) return
    if (needsValue && numSets > 1 && isResistanceType && editForm.weightsPerSet?.some(w => !w || parseFloat(w) <= 0)) return
    if (needsTime && totalSeconds === 0) return

    const measurementInfo = MEASUREMENT_TYPES.find(m => m.value === editForm.measurementType)
    
    let finalValue = null
    let finalUnit = measurementInfo?.unit || ''
    
    if (editForm.measurementType === 'time') {
      finalValue = totalSeconds
      finalUnit = 'seconds'
    } else if (needsValue) {
      // Use weightsPerSet if multiple sets and resistance type, otherwise single value
      if (numSets > 1 && isResistanceType && editForm.weightsPerSet?.length > 0) {
        finalValue = editForm.weightsPerSet.map(w => parseFloat(w))
      } else {
        finalValue = parseFloat(editForm.measurementValue)
      }
    }

    const updates = {
      name: editForm.name.trim(),
      sets: needsSetsReps ? numSets : null,
      reps: needsSetsReps ? editForm.repsPerSet.map(r => parseInt(r)) : null,
      measurementType: editForm.measurementType,
      measurementValue: finalValue,
      measurementUnit: finalUnit
    }

    try {
      await updateWorkout(currentUser.uid, editingExercise, updates)
      setExercises(exercises.map(ex => 
        ex.id === editingExercise ? { ...ex, ...updates } : ex
      ))
      cancelEditing()
    } catch (error) {
      console.error('Error updating workout:', error)
    }
  }

  // Drag and drop functions
  const handleDragStart = (e, exercise) => {
    setDraggedExercise(exercise)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging')
    setDraggedExercise(null)
    setDragOverExercise(null)
  }

  const handleDragOver = (e, exercise) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedExercise && exercise.id !== draggedExercise.id) {
      setDragOverExercise(exercise.id)
    }
  }

  const handleDragLeave = () => {
    setDragOverExercise(null)
  }

  const handleDrop = async (e, targetExercise) => {
    e.preventDefault()
    setDragOverExercise(null)
    
    if (!draggedExercise || draggedExercise.id === targetExercise.id) return

    // Get exercises for selected date
    const dateExercises = exercises.filter(ex => ex.date === selectedDate)
    const draggedIndex = dateExercises.findIndex(ex => ex.id === draggedExercise.id)
    const targetIndex = dateExercises.findIndex(ex => ex.id === targetExercise.id)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder the array
    const reordered = [...dateExercises]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

    // Assign new order values
    const orderUpdates = reordered.map((ex, index) => ({
      id: ex.id,
      order: index
    }))

    // Update local state immediately for responsiveness
    const newExercises = exercises.map(ex => {
      const orderUpdate = orderUpdates.find(u => u.id === ex.id)
      return orderUpdate ? { ...ex, order: orderUpdate.order } : ex
    })
    setExercises(newExercises)

    // Persist to database
    try {
      await updateWorkoutsOrder(currentUser.uid, orderUpdates)
    } catch (error) {
      console.error('Error updating order:', error)
      // Revert on error
      setExercises(exercises)
    }

    setDraggedExercise(null)
  }

  // Select a saved exercise from suggestions
  const selectSavedExercise = (savedEx) => {
    setExerciseName(savedEx.name)
    setMeasurementType(savedEx.measurementType || 'resistance')
    
    // Handle measurement value - could be array (weights per set) or single value
    if (Array.isArray(savedEx.measurementValue)) {
      setWeightsPerSet(savedEx.measurementValue.map(String))
      setMeasurementValue(String(savedEx.measurementValue[0]) || '')
    } else {
      setMeasurementValue(savedEx.measurementValue ? String(savedEx.measurementValue) : '')
      setWeightsPerSet([])
    }
    
    if (savedEx.measurementType === 'time' && savedEx.measurementValue) {
      const totalSeconds = Array.isArray(savedEx.measurementValue) 
        ? savedEx.measurementValue[0] 
        : savedEx.measurementValue
      setTimeHours(Math.floor(totalSeconds / 3600) || '')
      setTimeMinutes(Math.floor((totalSeconds % 3600) / 60) || '')
      setTimeSeconds(totalSeconds % 60 || '')
    }
    
    if (savedEx.sets) {
      setSets(String(savedEx.sets))
      if (Array.isArray(savedEx.reps)) {
        setRepsPerSet(savedEx.reps.map(String))
      } else if (savedEx.reps) {
        setRepsPerSet([String(savedEx.reps)])
      }
    }
    
    setShowSuggestions(false)
  }

  // Get filtered suggestions based on input
  const getFilteredSuggestions = () => {
    if (!exerciseName.trim()) return savedExercises.slice(0, 10)
    const search = exerciseName.toLowerCase()
    return savedExercises
      .filter(ex => ex.name.toLowerCase().includes(search))
      .slice(0, 10)
  }

  // Get dates that have workouts for copy modal
  const getDatesWithWorkouts = () => {
    const dates = [...new Set(exercises.map(ex => ex.date))].filter(d => d !== selectedDate)
    return dates.sort((a, b) => new Date(b) - new Date(a)).slice(0, 30)
  }

  // Copy workout from another day
  const copyWorkoutFromDate = async () => {
    if (!copyFromDate) return
    
    const exercisesToCopy = exercises.filter(ex => ex.date === copyFromDate)
    if (exercisesToCopy.length === 0) return

    try {
      const newExercises = []
      for (let i = 0; i < exercisesToCopy.length; i++) {
        const ex = exercisesToCopy[i]
        const newExercise = {
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          measurementType: ex.measurementType,
          measurementValue: ex.measurementValue,
          measurementUnit: ex.measurementUnit,
          date: selectedDate,
          localTimestamp: new Date().toLocaleString(),
          order: ex.order ?? i
        }
        
        const id = await addWorkout(currentUser.uid, newExercise)
        newExercises.push({ id, ...newExercise, timestamp: { toDate: () => new Date() } })
      }
      
      setExercises([...newExercises, ...exercises])
      setShowCopyModal(false)
      setCopyFromDate('')
    } catch (error) {
      console.error('Error copying workout:', error)
    }
  }

  if (loading) {
    return <div className="workouts-page"><p>Loading...</p></div>
  }

  // Date navigation helpers
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = getLocalDateString()
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = getLocalDateString(yesterdayDate)
    
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const navigateDate = (direction) => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + direction)
    setSelectedDate(getLocalDateString(current))
  }

  const handleDateLabelClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker()
      } catch (e) {
        // Fallback for browsers that don't support showPicker
        dateInputRef.current.focus()
        dateInputRef.current.click()
      }
    }
  }

  const isToday = selectedDate === getLocalDateString()

  return (
    <div className="workouts-page">
      {/* Date Navigation */}
      <div className="date-navigation">
        <div className="date-nav-left">
          {!isToday && (
            <button 
              className="today-btn" 
              onClick={() => setSelectedDate(getLocalDateString())}
            >
              Today
            </button>
          )}
        </div>
        <div className="date-nav-core">
          <button 
            className="date-nav-btn" 
            onClick={() => navigateDate(-1)}
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="date-display">
            <span className="date-label" onClick={handleDateLabelClick}>{formatDisplayDate(selectedDate)}</span>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getLocalDateString()}
              className="date-input"
            />
          </div>
          <button 
            className="date-nav-btn" 
            onClick={() => navigateDate(1)}
            disabled={isToday}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <div className="date-nav-right">
          <button 
            type="button"
            className="copy-workout-btn"
            onClick={() => setShowCopyModal(true)}
            title="Copy workout from another day"
          >
            📋 Copy
          </button>
        </div>
      </div>
      
      {/* Copy Workout Modal */}
      {showCopyModal && (
        <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="copy-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Copy Workout From</h3>
            <p className="modal-description">Select a date to copy all exercises from</p>
            
            <div className="copy-dates-list">
              {getDatesWithWorkouts().length === 0 ? (
                <p className="empty-dates">No previous workouts found</p>
              ) : (
                getDatesWithWorkouts().map(date => {
                  const dateExercises = exercises.filter(ex => ex.date === date)
                  const isSelected = copyFromDate === date
                  return (
                    <div key={date} className="copy-date-wrapper">
                      <button
                        type="button"
                        className={`copy-date-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => setCopyFromDate(isSelected ? '' : date)}
                      >
                        <div className="copy-date-header">
                          <div className="copy-date-info">
                            <span className="copy-date-label">{formatDisplayDate(date)}</span>
                            <span className="copy-date-detail">{date} • {dateExercises.length} exercise{dateExercises.length !== 1 ? 's' : ''}</span>
                          </div>
                          <span className={`copy-date-chevron ${isSelected ? 'expanded' : ''}`}>▼</span>
                        </div>
                      </button>
                      {isSelected && dateExercises.length > 0 && (
                        <div className="copy-exercises-preview">
                          {dateExercises.map((ex, idx) => {
                            // Format reps - could be array or single value
                            const repsDisplay = Array.isArray(ex.reps) 
                              ? (ex.reps.every(r => r === ex.reps[0]) ? ex.reps[0] : ex.reps.join('/'))
                              : ex.reps
                            // Format weight/value - could be array or single value
                            const valueDisplay = Array.isArray(ex.measurementValue)
                              ? (ex.measurementValue.every(v => v === ex.measurementValue[0]) ? ex.measurementValue[0] : ex.measurementValue.join('/'))
                              : ex.measurementValue
                            
                            return (
                              <div key={ex.id || idx} className="copy-exercise-item">
                                <span className="copy-exercise-name">{ex.name}</span>
                                <span className="copy-exercise-details">
                                  {ex.sets} × {repsDisplay}
                                  {valueDisplay && ex.measurementType !== 'bodyweight' && ex.measurementType !== 'time' && (
                                    <> • {valueDisplay} {ex.measurementUnit}</>
                                  )}
                                  {ex.measurementType === 'time' && valueDisplay && (
                                    <> • {formatTimeDisplay(valueDisplay)}</>
                                  )}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                type="button"
                className="modal-copy-btn" 
                onClick={copyWorkoutFromDate}
                disabled={!copyFromDate}
              >
                Copy Exercises
              </button>
              <button 
                type="button"
                className="modal-cancel-btn" 
                onClick={() => { setShowCopyModal(false); setCopyFromDate(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <form className="workout-form" onSubmit={handleAddExercise}>
        <div className="form-group exercise-name-group">
          <label htmlFor="exercise-name">Exercise Name</label>
          <div className="autocomplete-container">
            <input
              type="text"
              id="exercise-name"
              placeholder="e.g., Bench Press, Squats..."
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
            />
            {showSuggestions && getFilteredSuggestions().length > 0 && (
              <div className="suggestions-dropdown">
                {getFilteredSuggestions().map((savedEx, index) => (
                  <button
                    key={index}
                    type="button"
                    className="suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      selectSavedExercise(savedEx)
                    }}
                  >
                    <span className="suggestion-name">{savedEx.name}</span>
                    <span className="suggestion-details">
                      {savedEx.measurementType === 'time' 
                        ? formatTimeDisplay(savedEx.measurementValue)
                        : savedEx.sets && savedEx.reps 
                          ? `${savedEx.sets}×${Array.isArray(savedEx.reps) ? savedEx.reps[0] : savedEx.reps}${savedEx.measurementValue ? ` @ ${savedEx.measurementValue}${savedEx.measurementUnit}` : ''}`
                          : savedEx.measurementType
                      }
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              max="20"
              value={measurementType === 'time' ? '' : sets}
              onChange={(e) => handleSetsChange(e.target.value)}
              disabled={measurementType === 'time'}
              className={measurementType === 'time' ? 'input-disabled' : ''}
            />
          </div>
          
          <div className="form-group">
            <label>Reps {parseInt(sets) > 1 ? '(per set)' : ''}</label>
            {measurementType === 'time' ? (
              <input
                type="number"
                placeholder="-"
                disabled
                className="input-disabled"
              />
            ) : parseInt(sets) > 1 ? (
              <div className="reps-per-set-hint">
                Enter below ↓
              </div>
            ) : (
              <input
                type="number"
                id="reps"
                placeholder="10"
                min="1"
                value={repsPerSet[0] || ''}
                onChange={(e) => handleRepsChange(0, e.target.value)}
              />
            )}
          </div>
        </div>
        
        {/* Dynamic reps and weights inputs for multiple sets */}
        {measurementType !== 'time' && parseInt(sets) > 1 && (
          <div className="reps-per-set-container">
            <label className="reps-per-set-label">Reps {measurementType === 'resistance' || measurementType === 'assistance' ? '& Weight' : ''} for each set</label>
            <div className="reps-per-set-inputs">
              {Array.from({ length: parseInt(sets) || 0 }, (_, index) => (
                <div key={index} className="rep-input-group">
                  <span className="set-number">Set {index + 1}</span>
                  <input
                    type="number"
                    placeholder="10"
                    min="1"
                    value={repsPerSet[index] || ''}
                    onChange={(e) => handleRepsChange(index, e.target.value)}
                    className="rep-input"
                    title="Reps"
                  />
                  <span className="input-label-small">reps</span>
                  {(measurementType === 'resistance' || measurementType === 'assistance') && (
                    <>
                      <span className="input-separator">@</span>
                      <input
                        type="number"
                        placeholder={currentMeasurement.placeholder}
                        min="0"
                        step="0.5"
                        value={weightsPerSet[index] || ''}
                        onChange={(e) => handleWeightChange(index, e.target.value)}
                        className="weight-input"
                        title="Weight"
                      />
                      <span className="input-label-small">{currentMeasurement.unit}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
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
          parseInt(sets) <= 1 || (measurementType !== 'resistance' && measurementType !== 'assistance')
        ) && (
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
        <h3 className="list-title">{isToday ? "Today's" : formatDisplayDate(selectedDate) + "'s"} Exercises</h3>
        
        {(() => {
          const selectedExercises = exercises
            .filter(ex => ex.date === selectedDate)
            .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
          
          return selectedExercises.length === 0 ? (
            <p className="empty-message">No exercises logged for this day. {isToday ? 'Start adding your workout!' : 'Add exercises or select another date.'}</p>
          ) : (
            <div className="exercises-grid">
              {selectedExercises.map((exercise) => (
                <div 
                  key={exercise.id} 
                  className={`exercise-card ${dragOverExercise === exercise.id ? 'drag-over' : ''} ${draggedExercise?.id === exercise.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, exercise)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, exercise)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, exercise)}
                >
                  {editingExercise === exercise.id ? (
                    // Edit Mode
                    <div className="exercise-edit-form">
                      <div className="edit-form-group">
                        <label>Exercise Name</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => handleEditFormChange('name', e.target.value)}
                          placeholder="Exercise name"
                        />
                      </div>
                      
                      <div className="edit-form-group">
                        <label>Type</label>
                        <select
                          value={editForm.measurementType || 'resistance'}
                          onChange={(e) => handleEditFormChange('measurementType', e.target.value)}
                        >
                          {MEASUREMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {editForm.measurementType !== 'time' && (
                        <div className="edit-form-row">
                          <div className="edit-form-group">
                            <label>Sets</label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={editForm.sets || ''}
                              onChange={(e) => handleEditFormChange('sets', e.target.value)}
                            />
                          </div>
                          <div className="edit-form-group">
                            <label>Reps</label>
                            {parseInt(editForm.sets) > 1 ? (
                              <span className="edit-reps-hint">Below</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={editForm.repsPerSet?.[0] || ''}
                                onChange={(e) => handleEditRepsChange(0, e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {editForm.measurementType !== 'time' && parseInt(editForm.sets) > 1 && (
                        <div className="edit-reps-container">
                          <label className="edit-reps-label">Reps {(editForm.measurementType === 'resistance' || editForm.measurementType === 'assistance') ? '& Weight' : ''} per set</label>
                          {Array.from({ length: parseInt(editForm.sets) || 0 }, (_, index) => (
                            <div key={index} className="edit-rep-input-group">
                              <span>S{index + 1}</span>
                              <input
                                type="number"
                                min="1"
                                value={editForm.repsPerSet?.[index] || ''}
                                onChange={(e) => handleEditRepsChange(index, e.target.value)}
                                placeholder="reps"
                              />
                              {(editForm.measurementType === 'resistance' || editForm.measurementType === 'assistance') && (
                                <>
                                  <span className="edit-separator">@</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={editForm.weightsPerSet?.[index] || ''}
                                    onChange={(e) => handleEditWeightChange(index, e.target.value)}
                                    placeholder={MEASUREMENT_TYPES.find(m => m.value === editForm.measurementType)?.placeholder}
                                  />
                                  <span className="edit-unit">{MEASUREMENT_TYPES.find(m => m.value === editForm.measurementType)?.unit}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {editForm.measurementType === 'time' && (
                        <div className="edit-time-inputs">
                          <div className="edit-time-group">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={editForm.timeHours || ''}
                              onChange={(e) => handleEditFormChange('timeHours', e.target.value)}
                              placeholder="0"
                            />
                            <span>h</span>
                          </div>
                          <div className="edit-time-group">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editForm.timeMinutes || ''}
                              onChange={(e) => handleEditFormChange('timeMinutes', e.target.value)}
                              placeholder="0"
                            />
                            <span>m</span>
                          </div>
                          <div className="edit-time-group">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editForm.timeSeconds || ''}
                              onChange={(e) => handleEditFormChange('timeSeconds', e.target.value)}
                              placeholder="0"
                            />
                            <span>s</span>
                          </div>
                        </div>
                      )}

                      {editForm.measurementType !== 'bodyweight' && editForm.measurementType !== 'time' && (
                        parseInt(editForm.sets) <= 1 || (editForm.measurementType !== 'resistance' && editForm.measurementType !== 'assistance')
                      ) && (
                        <div className="edit-form-group">
                          <label>
                            {MEASUREMENT_TYPES.find(m => m.value === editForm.measurementType)?.label || 'Value'}
                            {' '}({MEASUREMENT_TYPES.find(m => m.value === editForm.measurementType)?.unit || ''})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step={editForm.measurementType === 'distance' ? '0.1' : '0.5'}
                            value={editForm.measurementValue || ''}
                            onChange={(e) => handleEditFormChange('measurementValue', e.target.value)}
                          />
                        </div>
                      )}

                      <div className="edit-actions">
                        <button type="button" className="save-edit-btn" onClick={saveEdit}>
                          Save
                        </button>
                        <button type="button" className="cancel-edit-btn" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="exercise-header">
                        <div className="drag-handle" title="Drag to reorder">⋮⋮</div>
                        <h4 className="exercise-name">{exercise.name}</h4>
                        <div className="exercise-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => startEditing(exercise)}
                            aria-label="Edit exercise"
                          >
                            ✎
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteExercise(exercise.id)}
                            aria-label="Delete exercise"
                          >
                            ×
                          </button>
                        </div>
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
                            <span className="detail-value">
                              {Array.isArray(exercise.reps) 
                                ? exercise.reps.join(' / ') 
                                : exercise.reps}
                            </span>
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
                                ? Array.isArray(exercise.measurementValue)
                                  ? exercise.measurementValue.map(w => `${w}`).join(' / ') + ` ${exercise.measurementUnit || 'lbs'}`
                                  : `${exercise.measurementValue} ${exercise.measurementUnit || 'lbs'}`
                                : `${exercise.resistance} lbs`}
                            </span>
                          </div>
                        )}
                        
                        {/* Show Assistance for assisted exercises */}
                        {exercise.measurementType === 'assistance' && (
                          <div className="detail">
                            <span className="detail-label">Assistance</span>
                            <span className="detail-value">
                              {Array.isArray(exercise.measurementValue)
                                ? exercise.measurementValue.map(w => `-${w}`).join(' / ') + ` ${exercise.measurementUnit || 'lbs'}`
                                : `-${exercise.measurementValue} ${exercise.measurementUnit || 'lbs'}`}
                            </span>
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
                    </>
                  )}
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
