import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useTenantStore } from '../../store/tenantStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './Login.css'

/**
 * Register component
 * Sign up + create first tenant (business)
 */
const Register = () => {
  const navigate = useNavigate()
  const { signUp, isAuthenticated, isLoading, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password) {
      setLocalError('Please enter email and password')
      return
    }
    if (!businessName?.trim()) {
      setLocalError('Please enter your business name')
      return
    }

    const { error: signUpError, session } = await signUp(email, password)
    if (signUpError) {
      setLocalError(signUpError)
      return
    }

    if (!session && isSupabaseConfigured()) {
      setLocalError('Please check your email to confirm your account, then sign in.')
      return
    }

    if (session && isSupabaseConfigured() && supabase) {
      try {
        const { error: rpcError } = await supabase.rpc('create_tenant_and_join', {
          p_name: businessName.trim(),
          p_slug: null
        })
        if (rpcError) {
          console.error('Create tenant error:', rpcError)
          setLocalError(rpcError.message || 'Could not create business. You can sign in and try again.')
          return
        }
        await useTenantStore.getState().loadTenants(session.user.id)
        navigate('/', { replace: true })
      } catch (err) {
        setLocalError(err.message || 'Something went wrong')
      }
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="login">
      <div className="login__container">
        <div className="login__header">
          <h1 className="login__title">POS System</h1>
          <p className="login__subtitle">Create your account</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="login__error">
              {error || localError}
            </div>
          )}

          <div className="login__field">
            <label className="login__label">Business name</label>
            <input
              type="text"
              className="login__input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Mi Negocio"
              autoComplete="organization"
              required
              autoFocus
            />
          </div>

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
            />
          </div>

          <div className="login__field">
            <label className="login__label">Password</label>
            <input
              type="password"
              className="login__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="login__button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="login__footer">
          <p className="login__hint">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
