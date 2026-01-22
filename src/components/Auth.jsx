import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  const { signup, login, resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!isLogin && password !== confirmPassword) {
      return setError('Passwords do not match')
    }

    if (!isLogin && password.length < 6) {
      return setError('Password must be at least 6 characters')
    }

    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await signup(email, password, displayName)
      }
    } catch (err) {
      console.error(err)
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered')
          break
        case 'auth/invalid-email':
          setError('Invalid email address')
          break
        case 'auth/weak-password':
          setError('Password is too weak')
          break
        case 'auth/user-not-found':
          setError('No account found with this email')
          break
        case 'auth/wrong-password':
          setError('Incorrect password')
          break
        case 'auth/invalid-credential':
          setError('Invalid email or password')
          break
        default:
          setError('Failed to ' + (isLogin ? 'log in' : 'sign up'))
      }
    }

    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email) {
      return setError('Please enter your email address')
    }

    setLoading(true)

    try {
      await resetPassword(email)
      setMessage('Check your email for password reset instructions')
      setShowResetPassword(false)
    } catch (err) {
      console.error(err)
      setError('Failed to send reset email')
    }

    setLoading(false)
  }

  if (showResetPassword) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Reset Password</h2>
          
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <input
                type="email"
                id="reset-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>

          <div className="auth-switch">
            <button 
              type="button"
              onClick={() => setShowResetPassword(false)}
              className="switch-btn"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="displayName">Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required={!isLogin}
              />
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {isLogin && (
          <button 
            type="button"
            onClick={() => setShowResetPassword(true)}
            className="forgot-password-btn"
          >
            Forgot Password?
          </button>
        )}

        <div className="auth-switch">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setMessage('')
            }}
            className="switch-btn"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Auth
