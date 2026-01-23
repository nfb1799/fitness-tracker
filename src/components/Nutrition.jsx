import { useState, useEffect } from 'react'
import './Nutrition.css'
import { useAuth } from '../contexts/AuthContext'
import { getNutrition, addNutritionEntry, deleteNutritionEntry, getUserSettings } from '../firebase/firestoreService'

function Nutrition() {
  const { currentUser } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [settings, setSettings] = useState({
    calorieGoal: 2000,
    proteinGoal: 150
  })
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          const [nutritionData, userSettings] = await Promise.all([
            getNutrition(currentUser.uid),
            getUserSettings(currentUser.uid)
          ])
          setMeals(nutritionData)
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

  if (loading) {
    return <div className="nutrition-page"><p>Loading...</p></div>
  }

  // Date navigation helpers
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const navigateDate = (direction) => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + direction)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

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
          <span className="date-label">{formatDisplayDate(selectedDate)}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
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
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
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
        <div className="form-group">
          <label htmlFor="food-name">Food Item</label>
          <input
            type="text"
            id="food-name"
            placeholder="e.g., Grilled Chicken, Rice..."
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
          />
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
                <div className="meal-header">
                  <h4 className="meal-name">{meal.name}</h4>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteMeal(meal.id)}
                    aria-label="Delete meal"
                  >
                    ×
                  </button>
                </div>
                <div className="meal-macros">
                  <span className="macro calories">{meal.calories} cal</span>
                  <span className="macro protein">{meal.protein}g P</span>
                  <span className="macro carbs">{meal.carbs}g C</span>
                  <span className="macro fat">{meal.fat}g F</span>
                </div>
                <span className="meal-time">{meal.localTimestamp || (meal.timestamp?.toDate ? meal.timestamp.toDate().toLocaleString() : '')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Nutrition
