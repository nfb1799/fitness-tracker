import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { db } from './config'

// ============== User Settings ==============

export async function getUserSettings(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId))
  if (userDoc.exists()) {
    return userDoc.data().settings
  }
  return null
}

export async function updateUserSettings(userId, settings) {
  const userRef = doc(db, 'users', userId)
  await setDoc(userRef, { settings }, { merge: true })
}

// ============== Workouts ==============

export async function getWorkouts(userId) {
  const workoutsRef = collection(db, 'users', userId, 'workouts')
  const q = query(workoutsRef, orderBy('timestamp', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

export async function addWorkout(userId, workout) {
  const workoutsRef = collection(db, 'users', userId, 'workouts')
  const docRef = await addDoc(workoutsRef, {
    ...workout,
    timestamp: Timestamp.now()
  })
  return docRef.id
}

export async function deleteWorkout(userId, workoutId) {
  const workoutRef = doc(db, 'users', userId, 'workouts', workoutId)
  await deleteDoc(workoutRef)
}

export async function getWorkoutsByDate(userId, date) {
  const workoutsRef = collection(db, 'users', userId, 'workouts')
  const q = query(workoutsRef, where('date', '==', date))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// ============== Nutrition ==============

export async function getNutrition(userId) {
  const nutritionRef = collection(db, 'users', userId, 'nutrition')
  const q = query(nutritionRef, orderBy('timestamp', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

export async function addNutritionEntry(userId, entry) {
  const nutritionRef = collection(db, 'users', userId, 'nutrition')
  const docRef = await addDoc(nutritionRef, {
    ...entry,
    timestamp: Timestamp.now()
  })
  return docRef.id
}

export async function deleteNutritionEntry(userId, entryId) {
  const entryRef = doc(db, 'users', userId, 'nutrition', entryId)
  await deleteDoc(entryRef)
}

export async function getNutritionByDate(userId, date) {
  const nutritionRef = collection(db, 'users', userId, 'nutrition')
  const q = query(nutritionRef, where('date', '==', date))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// ============== Data Migration ==============

// Helper function to migrate local storage data to Firestore
export async function migrateLocalDataToFirestore(userId) {
  // Migrate workouts
  const localWorkouts = localStorage.getItem('workouts')
  if (localWorkouts) {
    const workouts = JSON.parse(localWorkouts)
    for (const workout of workouts) {
      await addWorkout(userId, {
        name: workout.name,
        reps: workout.reps,
        resistance: workout.resistance,
        date: workout.date,
        localTimestamp: workout.timestamp
      })
    }
    localStorage.removeItem('workouts')
  }

  // Migrate nutrition
  const localNutrition = localStorage.getItem('nutrition')
  if (localNutrition) {
    const entries = JSON.parse(localNutrition)
    for (const entry of entries) {
      await addNutritionEntry(userId, {
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        date: entry.date,
        localTimestamp: entry.timestamp
      })
    }
    localStorage.removeItem('nutrition')
  }

  // Migrate settings
  const localSettings = localStorage.getItem('fitnessSettings')
  if (localSettings) {
    const settings = JSON.parse(localSettings)
    await updateUserSettings(userId, settings)
    localStorage.removeItem('fitnessSettings')
  }

  return true
}

// ============== Data Export/Import ==============

export async function exportUserData(userId) {
  const [workouts, nutrition, settings] = await Promise.all([
    getWorkouts(userId),
    getNutrition(userId),
    getUserSettings(userId)
  ])

  return {
    settings,
    workouts,
    nutrition,
    exportDate: new Date().toISOString()
  }
}

export async function importUserData(userId, data) {
  // Import settings
  if (data.settings) {
    await updateUserSettings(userId, data.settings)
  }

  // Import workouts
  if (data.workouts && Array.isArray(data.workouts)) {
    for (const workout of data.workouts) {
      await addWorkout(userId, {
        name: workout.name,
        reps: workout.reps,
        resistance: workout.resistance,
        date: workout.date,
        localTimestamp: workout.timestamp || workout.localTimestamp
      })
    }
  }

  // Import nutrition
  if (data.nutrition && Array.isArray(data.nutrition)) {
    for (const entry of data.nutrition) {
      await addNutritionEntry(userId, {
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        date: entry.date,
        localTimestamp: entry.timestamp || entry.localTimestamp
      })
    }
  }

  return true
}

// ============== Social Feed ==============

// Get user profile by ID
export async function getUserProfile(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId))
  if (userDoc.exists()) {
    return { id: userId, ...userDoc.data() }
  }
  return null
}

// Get all users' public data for social feed
export async function getAllUsersPublicData() {
  const usersSnapshot = await getDocs(collection(db, 'users'))
  const usersData = []

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const userId = userDoc.id

    // Get user's workouts
    const workoutsRef = collection(db, 'users', userId, 'workouts')
    const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'))
    const workoutsSnapshot = await getDocs(workoutsQuery)
    const workouts = workoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get user's nutrition
    const nutritionRef = collection(db, 'users', userId, 'nutrition')
    const nutritionQuery = query(nutritionRef, orderBy('timestamp', 'desc'))
    const nutritionSnapshot = await getDocs(nutritionQuery)
    const nutrition = nutritionSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    usersData.push({
      userId,
      displayName: userData.displayName || userData.settings?.name || 'Anonymous',
      email: userData.email,
      workouts,
      nutrition
    })
  }

  return usersData
}

// Get recent activity from all users (combined feed)
export async function getSocialFeed(limit = 50) {
  const usersSnapshot = await getDocs(collection(db, 'users'))
  const allActivity = []

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const userId = userDoc.id
    const displayName = userData.displayName || userData.settings?.name || 'Anonymous'

    // Get user's recent workouts
    const workoutsRef = collection(db, 'users', userId, 'workouts')
    const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'))
    const workoutsSnapshot = await getDocs(workoutsQuery)
    
    workoutsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      allActivity.push({
        id: `${userId}-workout-${doc.id}`,
        type: 'workout',
        userId,
        displayName,
        data: { id: doc.id, ...data },
        timestamp: data.timestamp
      })
    })

    // Get user's recent nutrition
    const nutritionRef = collection(db, 'users', userId, 'nutrition')
    const nutritionQuery = query(nutritionRef, orderBy('timestamp', 'desc'))
    const nutritionSnapshot = await getDocs(nutritionQuery)
    
    nutritionSnapshot.docs.forEach(doc => {
      const data = doc.data()
      allActivity.push({
        id: `${userId}-nutrition-${doc.id}`,
        type: 'nutrition',
        userId,
        displayName,
        data: { id: doc.id, ...data },
        timestamp: data.timestamp
      })
    })
  }

  // Sort by timestamp (most recent first) and limit
  allActivity.sort((a, b) => {
    const timeA = a.timestamp?.toDate?.() || new Date(0)
    const timeB = b.timestamp?.toDate?.() || new Date(0)
    return timeB - timeA
  })

  return allActivity.slice(0, limit)
}
