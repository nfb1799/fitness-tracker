import { useState, useEffect, useRef } from 'react'
import './Nutrition.css'
import { useAuth } from '../contexts/AuthContext'
import { getNutrition, addNutritionEntry, deleteNutritionEntry, updateNutritionEntry, getUserSettings, getSavedMeals, saveMeal } from '../firebase/firestoreService'

// Helper to get local date string (YYYY-MM-DD format)
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function Nutrition() {
  const { currentUser } = useAuth()
  const [meals, setMeals] = useState([])
  const [savedMeals, setSavedMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [settings, setSettings] = useState({
    calorieGoal: 2000,
    proteinGoal: 150
  })
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [editingMeal, setEditingMeal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const dateInputRef = useRef(null)

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          const [nutritionData, userSettings, savedMealsData] = await Promise.all([
            getNutrition(currentUser.uid),
            getUserSettings(currentUser.uid),
            getSavedMeals(currentUser.uid)
          ])
          setMeals(nutritionData)
          setSavedMeals(savedMealsData)
          if (userSettings) {
            setSettings(prev => ({ ...prev, ...userSettings }))
          }
        } catch (error) {
          console.error('Error loading nutrition data:', error)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [currentUser])

  // Handle clicks outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter suggestions based on input
  useEffect(() => {
    if (foodName.trim().length > 0) {
      const filtered = savedMeals.filter(meal => 
        meal.displayName.toLowerCase().includes(foodName.toLowerCase())
      ).slice(0, 8)
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }, [foodName, savedMeals])

  const handleSelectSuggestion = (meal) => {
    setFoodName(meal.displayName)
    setCalories(meal.calories.toString())
    setProtein(meal.protein.toString())
    setCarbs(meal.carbs.toString())
    setFat(meal.fat.toString())
    setShowSuggestions(false)
  }

  const handleAddMeal = async (e) => {
    e.preventDefault()
    
    if (!foodName.trim() || !calories) {
      return
    }

    const newMeal = {
      name: foodName.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      date: selectedDate,
      localTimestamp: new Date().toLocaleString()
    }

    try {
      const id = await addNutritionEntry(currentUser.uid, newMeal)
      setMeals([{ id, ...newMeal, timestamp: { toDate: () => new Date() } }, ...meals])
      
      // Save meal for future autocomplete
      await saveMeal(currentUser.uid, newMeal)
      
      // Refresh saved meals list
      const updatedSavedMeals = await getSavedMeals(currentUser.uid)
      setSavedMeals(updatedSavedMeals)
      
      setFoodName('')
      setCalories('')
      setProtein('')
      setCarbs('')
      setFat('')
    } catch (error) {
      console.error('Error adding meal:', error)
    }
  }

  const handleDeleteMeal = async (id) => {
    try {
      await deleteNutritionEntry(currentUser.uid, id)
      setMeals(meals.filter(meal => meal.id !== id))
    } catch (error) {
      console.error('Error deleting meal:', error)
    }
  }

  // Edit meal functions
  const startEditingMeal = (meal) => {
    setEditingMeal(meal.id)
    setEditForm({
      name: meal.name,
      calories: meal.calories.toString(),
      protein: (meal.protein || 0).toString(),
      carbs: (meal.carbs || 0).toString(),
      fat: (meal.fat || 0).toString()
    })
  }

  const cancelEditingMeal = () => {
    setEditingMeal(null)
    setEditForm({})
  }

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const saveEditMeal = async () => {
    if (!editForm.name?.trim()) return

    const updates = {
      name: editForm.name.trim(),
      calories: parseInt(editForm.calories) || 0,
      protein: parseInt(editForm.protein) || 0,
      carbs: parseInt(editForm.carbs) || 0,
      fat: parseInt(editForm.fat) || 0
    }

    try {
      await updateNutritionEntry(currentUser.uid, editingMeal, updates)
      setMeals(meals.map(meal => 
        meal.id === editingMeal ? { ...meal, ...updates } : meal
      ))
      cancelEditingMeal()
    } catch (error) {
      console.error('Error updating meal:', error)
    }
  }

  if (loading) {
    return <div className="nutrition-page"><p>Loading...</p></div>
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

  const selectedMeals = meals.filter(meal => meal.date === selectedDate)

  const dailyTotals = selectedMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fat: totals.fat + meal.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div className="nutrition-page">
      <h2 className="nutrition-title">Track Your Nutrition</h2>
      
      {/* Date Navigation */}
      <div className="date-navigation">
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
        {!isToday && (
          <button 
            className="today-btn" 
            onClick={() => setSelectedDate(getLocalDateString())}
          >
            Today
          </button>
        )}
      </div>
      
      <div className="daily-summary">
        <h3 className="summary-title">{isToday ? "Today's" : formatDisplayDate(selectedDate) + "'s"} Progress</h3>
        <div className="goals-section">
          <div className="goal-item">
            <div className="goal-header">
              <span className="goal-label">Calories</span>
              <span className="goal-values">
                <span className="goal-current calories">{dailyTotals.calories}</span>
                <span className="goal-separator">/</span>
                <span className="goal-target">{settings.calorieGoal}</span>
              </span>
            </div>
            <div className="goal-progress-bar">
              <div 
                className="goal-progress-fill calories" 
                style={{ width: `${Math.min((dailyTotals.calories / settings.calorieGoal) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="goal-remaining">
              {dailyTotals.calories >= settings.calorieGoal 
                ? `${dailyTotals.calories - settings.calorieGoal} over goal` 
                : `${settings.calorieGoal - dailyTotals.calories} remaining`}
            </span>
          </div>
          <div className="goal-item">
            <div className="goal-header">
              <span className="goal-label">Protein</span>
              <span className="goal-values">
                <span className="goal-current protein">{dailyTotals.protein}g</span>
                <span className="goal-separator">/</span>
                <span className="goal-target">{settings.proteinGoal}g</span>
              </span>
            </div>
            <div className="goal-progress-bar">
              <div 
                className="goal-progress-fill protein" 
                style={{ width: `${Math.min((dailyTotals.protein / settings.proteinGoal) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="goal-remaining">
              {dailyTotals.protein >= settings.proteinGoal 
                ? `${dailyTotals.protein - settings.proteinGoal}g over goal` 
                : `${settings.proteinGoal - dailyTotals.protein}g remaining`}
            </span>
          </div>
        </div>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value calories">{dailyTotals.calories}</span>
            <span className="stat-label">Calories</span>
          </div>
          <div className="stat">
            <span className="stat-value protein">{dailyTotals.protein}g</span>
            <span className="stat-label">Protein</span>
          </div>
          <div className="stat">
            <span className="stat-value carbs">{dailyTotals.carbs}g</span>
            <span className="stat-label">Carbs</span>
          </div>
          <div className="stat">
            <span className="stat-value fat">{dailyTotals.fat}g</span>
            <span className="stat-label">Fat</span>
          </div>
        </div>
      </div>

      <form className="nutrition-form" onSubmit={handleAddMeal}>
        <div className="form-group food-input-group">
          <label htmlFor="food-name">Food Item</label>
          <div className="autocomplete-wrapper">
            <input
              ref={inputRef}
              type="text"
              id="food-name"
              placeholder="e.g., Grilled Chicken, Rice..."
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              onFocus={() => {
                if (filteredSuggestions.length > 0) setShowSuggestions(true)
              }}
              autoComplete="off"
            />
            {showSuggestions && (
              <div className="suggestions-dropdown" ref={suggestionsRef}>
                {filteredSuggestions.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(meal)}
                  >
                    <span className="suggestion-name">{meal.displayName}</span>
                    <span className="suggestion-macros">
                      {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {savedMeals.length > 0 && !showSuggestions && !foodName && (
            <span className="input-hint">Start typing to see saved meals</span>
          )}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="calories">Calories</label>
            <input
              type="number"
              id="calories"
              placeholder="250"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="protein">Protein (g)</label>
            <input
              type="number"
              id="protein"
              placeholder="30"
              min="0"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="carbs">Carbs (g)</label>
            <input
              type="number"
              id="carbs"
              placeholder="45"
              min="0"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="fat">Fat (g)</label>
            <input
              type="number"
              id="fat"
              placeholder="10"
              min="0"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </div>
        </div>
        
        <button type="submit" className="add-btn">
          Add Food
        </button>
      </form>

      <div className="meals-list">
        <h3 className="list-title">{isToday ? "Today's" : formatDisplayDate(selectedDate) + "'s"} Meals</h3>
        
        {selectedMeals.length === 0 ? (
          <p className="empty-message">No meals logged for this day. {isToday ? 'Start tracking your nutrition!' : 'Add meals or select another date.'}</p>
        ) : (
          <div className="meals-grid">
            {selectedMeals.map((meal) => (
              <div key={meal.id} className="meal-card">
                {editingMeal === meal.id ? (
                  // Edit Mode
                  <div className="meal-edit-form">
                    <div className="edit-form-group">
                      <label>Food Name</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleEditFormChange('name', e.target.value)}
                        placeholder="Food name"
                      />
                    </div>
                    <div className="edit-form-row">
                      <div className="edit-form-group">
                        <label>Calories</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.calories || ''}
                          onChange={(e) => handleEditFormChange('calories', e.target.value)}
                        />
                      </div>
                      <div className="edit-form-group">
                        <label>Protein (g)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.protein || ''}
                          onChange={(e) => handleEditFormChange('protein', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="edit-form-row">
                      <div className="edit-form-group">
                        <label>Carbs (g)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.carbs || ''}
                          onChange={(e) => handleEditFormChange('carbs', e.target.value)}
                        />
                      </div>
                      <div className="edit-form-group">
                        <label>Fat (g)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.fat || ''}
                          onChange={(e) => handleEditFormChange('fat', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="edit-actions">
                      <button type="button" className="save-edit-btn" onClick={saveEditMeal}>
                        Save
                      </button>
                      <button type="button" className="cancel-edit-btn" onClick={cancelEditingMeal}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="meal-header">
                      <h4 className="meal-name">{meal.name}</h4>
                      <div className="meal-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => startEditingMeal(meal)}
                          aria-label="Edit meal"
                        >
                          ✎
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteMeal(meal.id)}
                          aria-label="Delete meal"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="meal-macros">
                      <span className="macro calories">{meal.calories} cal</span>
                      <span className="macro protein">{meal.protein}g P</span>
                      <span className="macro carbs">{meal.carbs}g C</span>
                      <span className="macro fat">{meal.fat}g F</span>
                    </div>
                    <span className="meal-time">{meal.localTimestamp || (meal.timestamp?.toDate ? meal.timestamp.toDate().toLocaleString() : '')}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Nutrition
