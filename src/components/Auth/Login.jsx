import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './Login.css'

/**
 * Login component
 * Handles user authentication
 */
const Login = () => {
  const navigate = useNavigate()
  const { signIn, isAuthenticated, isLoading, error, checkSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password) {
      setLocalError('Please enter email and password')
      return
    }

    const { error } = await signIn(email, password)
    if (error) {
      setLocalError(error)
    }
  }

  return (
    <div className="login">
      <div className="login__container">
        <div className="login__header">
          <h1 className="login__title">POS System</h1>
          <p className="login__subtitle">Sign in to continue</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="login__error">
              {error || localError}
            </div>
          )}

          <div className="login__field">
            <label className="login__label">Email</label>
            <input
              type="email"
              className="login__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="email"
              required
              autoFocus
            />
          </div>

          <div className="login__field">
            <label className="login__label">Password</label>
            <input
              type="password"
              className="login__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="login__button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login__footer">
          <p className="login__hint">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
          <p className="login__hint">
            Demo: Use any email/password if Supabase is not configured
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login