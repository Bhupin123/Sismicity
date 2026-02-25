import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../services/firebase'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'

export default function Register() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setNotification = useAppStore((s) => s.setNotification)
  const setUser = useAuthStore((s) => s.setUser)  // ← ADD THIS

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const result = await registerUser(
      formData.email,
      formData.password,
      formData.displayName
    )

    if (result.success) {
      setUser(result.user)  // ← SET USER IN STORE IMMEDIATELY
      setNotification(` Account created! Welcome, ${formData.displayName}!`)
      navigate('/')
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628 0%, #1e2535 100%)',
      padding: 20
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: '#0d1b2a',
        borderRadius: 16,
        padding: 40,
        border: '1px solid rgba(0, 200, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}></div>
          <h1 style={{ color: '#00c8ff', fontSize: 32, margin: 0 }}>SeismoIQ</h1>
          <p style={{ color: '#5a7a99', fontSize: 14, marginTop: 4 }}>
            Create your account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(255, 61, 61, 0.1)',
            border: '1px solid rgba(255, 61, 61, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            color: '#ff3d3d',
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#5a7a99',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 600
            }}>
              FULL NAME
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              required
              placeholder="John Doe"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#0a1628',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#5a7a99',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 600
            }}>
              EMAIL
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#0a1628',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#5a7a99',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 600
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#0a1628',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              color: '#5a7a99',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 600
            }}>
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#0a1628',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{
          textAlign: 'center',
          marginTop: 24,
          color: '#5a7a99',
          fontSize: 13
        }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: '#00c8ff', textDecoration: 'none', fontWeight: 600 }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}