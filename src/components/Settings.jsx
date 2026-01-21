import { useState, useEffect } from 'react'
import './Settings.css'

function Settings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('fitnessSettings')
    return saved ? JSON.parse(saved) : {
      name: '',
      weight: '',
      height: '',
      calorieGoal: 2000,
      proteinGoal: 150,
      workoutDaysGoal: 4,
      weightUnit: 'lbs',
      heightUnit: 'in',
      theme: 'dark'
    }
  })

  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    localStorage.setItem('fitnessSettings', JSON.stringify(settings))
  }, [settings])

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    setSaveMessage('Settings saved!')
    setTimeout(() => setSaveMessage(''), 2000)
  }

  const handleClearWorkouts = () => {
    if (window.confirm('Are you sure you want to clear all workout data? This cannot be undone.')) {
      localStorage.removeItem('workouts')
      setSaveMessage('Workout data cleared!')
      setTimeout(() => setSaveMessage(''), 2000)
    }
  }

  const handleClearNutrition = () => {
    if (window.confirm('Are you sure you want to clear all nutrition data? This cannot be undone.')) {
      localStorage.removeItem('nutrition')
      setSaveMessage('Nutrition data cleared!')
      setTimeout(() => setSaveMessage(''), 2000)
    }
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear ALL data? This includes workouts, nutrition, and settings. This cannot be undone.')) {
      localStorage.removeItem('workouts')
      localStorage.removeItem('nutrition')
      localStorage.removeItem('fitnessSettings')
      setSettings({
        name: '',
        weight: '',
        height: '',
        calorieGoal: 2000,
        proteinGoal: 150,
        workoutDaysGoal: 4,
        weightUnit: 'lbs',
        heightUnit: 'in',
        theme: 'dark'
      })
      setSaveMessage('All data cleared!')
      setTimeout(() => setSaveMessage(''), 2000)
    }
  }

  const handleExportData = () => {
    const data = {
      settings: settings,
      workouts: JSON.parse(localStorage.getItem('workouts') || '[]'),
      nutrition: JSON.parse(localStorage.getItem('nutrition') || '[]'),
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fitness-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setSaveMessage('Data exported!')
    setTimeout(() => setSaveMessage(''), 2000)
  }

  const handleImportData = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        
        if (data.settings) {
          setSettings(data.settings)
          localStorage.setItem('fitnessSettings', JSON.stringify(data.settings))
        }
        if (data.workouts) {
          localStorage.setItem('workouts', JSON.stringify(data.workouts))
        }
        if (data.nutrition) {
          localStorage.setItem('nutrition', JSON.stringify(data.nutrition))
        }
        
        setSaveMessage('Data imported successfully!')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (err) {
        setSaveMessage('Error importing data. Invalid file format.')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">Settings</h2>

      {saveMessage && (
        <div className="save-message">{saveMessage}</div>
      )}

      {/* Appearance Section */}
      <div className="settings-section">
        <h3 className="section-title">🎨 Appearance</h3>
        <div className="theme-toggle-container">
          <span className="theme-label">Theme</span>
          <div className="theme-toggle">
            <button
              className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => handleChange('theme', 'light')}
            >
              ☀️ Light
            </button>
            <button
              className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleChange('theme', 'dark')}
            >
              🌙 Dark
            </button>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="settings-section">
        <h3 className="section-title">👤 Profile</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              placeholder="Your name"
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label htmlFor="weight">Weight</label>
            <div className="input-with-unit">
              <input
                type="number"
                id="weight"
                placeholder="180"
                value={settings.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
              />
              <select
                value={settings.weightUnit}
                onChange={(e) => handleChange('weightUnit', e.target.value)}
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
          <div className="setting-item">
            <label htmlFor="height">Height</label>
            <div className="input-with-unit">
              <input
                type="number"
                id="height"
                placeholder="70"
                value={settings.height}
                onChange={(e) => handleChange('height', e.target.value)}
              />
              <select
                value={settings.heightUnit}
                onChange={(e) => handleChange('heightUnit', e.target.value)}
              >
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="settings-section">
        <h3 className="section-title">🎯 Daily Goals</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="calorieGoal">Calorie Goal</label>
            <div className="input-with-unit">
              <input
                type="number"
                id="calorieGoal"
                placeholder="2000"
                value={settings.calorieGoal}
                onChange={(e) => handleChange('calorieGoal', parseInt(e.target.value) || 0)}
              />
              <span className="unit-label">cal</span>
            </div>
          </div>
          <div className="setting-item">
            <label htmlFor="proteinGoal">Protein Goal</label>
            <div className="input-with-unit">
              <input
                type="number"
                id="proteinGoal"
                placeholder="150"
                value={settings.proteinGoal}
                onChange={(e) => handleChange('proteinGoal', parseInt(e.target.value) || 0)}
              />
              <span className="unit-label">g</span>
            </div>
          </div>
          <div className="setting-item">
            <label htmlFor="workoutDaysGoal">Weekly Workout Days</label>
            <div className="input-with-unit">
              <input
                type="number"
                id="workoutDaysGoal"
                placeholder="4"
                min="1"
                max="7"
                value={settings.workoutDaysGoal}
                onChange={(e) => handleChange('workoutDaysGoal', parseInt(e.target.value) || 0)}
              />
              <span className="unit-label">days</span>
            </div>
          </div>
        </div>
        <button className="save-btn" onClick={handleSave}>
          Save Settings
        </button>
      </div>

      {/* Data Management Section */}
      <div className="settings-section">
        <h3 className="section-title">💾 Data Management</h3>
        <div className="data-actions">
          <div className="data-action-group">
            <p className="action-description">Export your data for backup or transfer to another device.</p>
            <button className="action-btn export" onClick={handleExportData}>
              Export Data
            </button>
          </div>
          <div className="data-action-group">
            <p className="action-description">Import previously exported data.</p>
            <label className="action-btn import">
              Import Data
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                hidden
              />
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger-zone">
        <h3 className="section-title">⚠️ Danger Zone</h3>
        <div className="danger-actions">
          <div className="danger-action">
            <div className="danger-info">
              <span className="danger-title">Clear Workout Data</span>
              <span className="danger-description">Delete all logged exercises</span>
            </div>
            <button className="danger-btn" onClick={handleClearWorkouts}>
              Clear Workouts
            </button>
          </div>
          <div className="danger-action">
            <div className="danger-info">
              <span className="danger-title">Clear Nutrition Data</span>
              <span className="danger-description">Delete all logged meals</span>
            </div>
            <button className="danger-btn" onClick={handleClearNutrition}>
              Clear Nutrition
            </button>
          </div>
          <div className="danger-action">
            <div className="danger-info">
              <span className="danger-title">Clear All Data</span>
              <span className="danger-description">Delete everything and reset the app</span>
            </div>
            <button className="danger-btn danger-btn-all" onClick={handleClearAll}>
              Clear Everything
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
