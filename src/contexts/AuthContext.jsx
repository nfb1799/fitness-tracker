import { createContext, useContext, useState, useEffect } from 'react'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sign up function
  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update profile with display name
    await updateProfile(userCredential.user, { displayName })
    
    // Create user profile document in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid)
    const defaultProfile = {
      displayName,
      email,
      createdAt: new Date().toISOString(),
      settings: {
        name: displayName,
        weight: '',
        height: '',
        calorieGoal: 2000,
        proteinGoal: 150,
        workoutDaysGoal: 4,
        weightUnit: 'lbs',
        heightUnit: 'in',
        theme: 'dark'
      }
    }
    
    await setDoc(userDocRef, defaultProfile)
    setUserProfile(defaultProfile)
    
    return userCredential
  }

  // Login function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  // Logout function
  function logout() {
    setUserProfile(null)
    return signOut(auth)
  }

  // Reset password
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  // Fetch user profile from Firestore
  async function fetchUserProfile(uid) {
    const userDocRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userDocRef)
    
    if (userDoc.exists()) {
      const profile = userDoc.data()
      setUserProfile(profile)
      return profile
    }
    return null
  }

  // Update user profile in Firestore
  async function updateUserProfile(updates) {
    if (!currentUser) return
    
    const userDocRef = doc(db, 'users', currentUser.uid)
    await setDoc(userDocRef, updates, { merge: true })
    
    setUserProfile(prev => ({ ...prev, ...updates }))
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      
      if (user) {
        await fetchUserProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    fetchUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
