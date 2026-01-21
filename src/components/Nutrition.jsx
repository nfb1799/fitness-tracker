import { useState, useEffect } from 'react'
import './Nutrition.css'

function Nutrition() {
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('nutrition')
    return saved ? JSON.parse(saved) : []
  })
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
    localStorage.setItem('nutrition', JSON.stringify(meals))
  }, [meals])

  useEffect(() => {
    const savedSettings = localStorage.getItem('fitnessSettings')
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))
    }
  }, [])

  const handleAddMeal = (e) => {
    e.preventDefault()
    
    if (!foodName.trim() || !calories) {
      return
    }

    const newMeal = {
      id: Date.now(),
      name: foodName.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    }

    setMeals([newMeal, ...meals])
    setFoodName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
  }

  const handleDeleteMeal = (id) => {
    setMeals(meals.filter(meal => meal.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const todaysMeals = meals.filter(meal => meal.date === today)

  const dailyTotals = todaysMeals.reduce(
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
      
      <div className="daily-summary">
        <h3 className="summary-title">Today's Progress</h3>
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
        <h3 className="list-title">Today's Meals</h3>
        
        {todaysMeals.length === 0 ? (
          <p className="empty-message">No meals logged yet. Start tracking your nutrition!</p>
        ) : (
          <div className="meals-grid">
            {todaysMeals.map((meal) => (
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
                <span className="meal-time">{meal.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Nutrition
