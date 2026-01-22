import { useState, useEffect } from 'react'
import './Settings.css'
import { useAuth } from '../contexts/AuthContext'
import { getUserSettings, updateUserSettings, exportUserData, importUserData, getWorkouts, getNutrition } from '../firebase/firestoreService'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

function Settings() {
  const { currentUser, updateUserProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    name: '',
    height: '',
    calorieGoal: 2000,
    proteinGoal: 150,
    workoutDaysGoal: 4,
    weightUnit: 'lbs',
    heightUnit: 'in',
    targetWeight: '',
    theme: localStorage.getItem('theme') || 'light'
  })

  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      if (currentUser) {
        try {
          const userSettings = await getUserSettings(currentUser.uid)
          if (userSettings) {
            // Preserve the current theme from localStorage instead of overwriting
            const currentTheme = localStorage.getItem('theme') || 'light'
            setSettings(prev => ({ ...prev, ...userSettings, theme: currentTheme }))
          }
        } catch (error) {
          console.error('Error loading settings:', error)
        }
      }
      setLoading(false)
    }
    loadSettings()
  }, [currentUser])

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    // Immediately save theme to localStorage for instant feedback
    if (field === 'theme') {
      localStorage.setItem('theme', value)
      document.documentElement.setAttribute('data-theme', value)
    }
  }

  const handleSave = async () => {
    try {
      await updateUserSettings(currentUser.uid, settings)
      await updateUserProfile({ settings })
      setSaveMessage('Settings saved!')
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveMessage('Error saving settings')
      setTimeout(() => setSaveMessage(''), 2000)
    }
  }

  const handleClearWorkouts = async () => {
    if (window.confirm('Are you sure you want to clear all workout data? This cannot be undone.')) {
      try {
        const workoutsRef = collection(db, 'users', currentUser.uid, 'workouts')
        const snapshot = await getDocs(workoutsRef)
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'workouts', docSnap.id)))
        await Promise.all(deletePromises)
        setSaveMessage('Workout data cleared!')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (error) {
        console.error('Error clearing workouts:', error)
        setSaveMessage('Error clearing data')
        setTimeout(() => setSaveMessage(''), 2000)
      }
    }
  }

  const handleClearNutrition = async () => {
    if (window.confirm('Are you sure you want to clear all nutrition data? This cannot be undone.')) {
      try {
        const nutritionRef = collection(db, 'users', currentUser.uid, 'nutrition')
        const snapshot = await getDocs(nutritionRef)
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'nutrition', docSnap.id)))
        await Promise.all(deletePromises)
        setSaveMessage('Nutrition data cleared!')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (error) {
        console.error('Error clearing nutrition:', error)
        setSaveMessage('Error clearing data')
        setTimeout(() => setSaveMessage(''), 2000)
      }
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL data? This includes workouts, nutrition, weigh-ins, and settings. This cannot be undone.')) {
      try {
        // Clear workouts
        const workoutsRef = collection(db, 'users', currentUser.uid, 'workouts')
        const workoutsSnapshot = await getDocs(workoutsRef)
        await Promise.all(workoutsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'workouts', docSnap.id))))
        
        // Clear nutrition
        const nutritionRef = collection(db, 'users', currentUser.uid, 'nutrition')
        const nutritionSnapshot = await getDocs(nutritionRef)
        await Promise.all(nutritionSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'nutrition', docSnap.id))))
        
        // Clear weigh-ins
        const weighInsRef = collection(db, 'users', currentUser.uid, 'weighins')
        const weighInsSnapshot = await getDocs(weighInsRef)
        await Promise.all(weighInsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'weighins', docSnap.id))))
        
        // Reset settings
        const defaultSettings = {
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
        await updateUserSettings(currentUser.uid, defaultSettings)
        setSettings(defaultSettings)
        
        setSaveMessage('All data cleared!')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (error) {
        console.error('Error clearing all data:', error)
        setSaveMessage('Error clearing data')
        setTimeout(() => setSaveMessage(''), 2000)
      }
    }
  }

  const handleExportData = async () => {
    try {
      const data = await exportUserData(currentUser.uid)
      
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
    } catch (error) {
      console.error('Error exporting data:', error)
      setSaveMessage('Error exporting data')
      setTimeout(() => setSaveMessage(''), 2000)
    }
  }

  const handleImportData = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        await importUserData(currentUser.uid, data)
        
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }))
        }
        
        setSaveMessage('Data imported successfully!')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (err) {
        console.error('Error importing data:', err)
        setSaveMessage('Error importing data. Invalid file format.')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (loading) {
    return <div className="settings-page"><p>Loading...</p></div>
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
        <h3 className="section-title">🎯 Goals</h3>
        
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="targetWeight">Target Weight</label>
            <div className="input-with-unit">
              <input
                type="number"
                id="targetWeight"
                placeholder={settings.weightUnit === 'lbs' ? '165' : '75'}
                value={settings.targetWeight}
                onChange={(e) => handleChange('targetWeight', e.target.value)}
              />
              <span className="unit-label">{settings.weightUnit}</span>
            </div>
          </div>
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
