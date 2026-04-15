import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, loginWithGoogle, loginWithApple } from '../services/firebase'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 814 1000" fill="#fff" style={{ flexShrink: 0 }}>
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 490.8 24 360.5 24 235.4c0-106 37.2-162.3 111.4-215.4 62.4-45 132.7-57.8 202.3-57.8 96 0 163.6 37.3 219.5 37.3 54 0 138.8-40.7 220.9-40.7 16.6 0 109.1 1.9 166.3 73.4zm-240.5-180.3c28.3-35 50-83.7 50-132.4 0-6.4-.6-12.8-1.9-18.5-47.8 1.9-104.3 32-138.2 71.9-27.1 31.1-52.2 79.8-52.2 129.4 0 7.1 1.3 14.2 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 43 0 97.1-29 126.8-68.2z"/>
  </svg>
)

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: '#0a1628',
  border: '1px solid rgba(0, 200, 255, 0.2)',
  borderRadius: 8,
  color: '#e0e0e0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box'
}

const labelStyle = {
  display: 'block',
  color: '#5a7a99',
  fontSize: 12,
  marginBottom: 6,
  fontWeight: 600,
  letterSpacing: '0.5px'
}

export default function Register() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setNotification = useAppStore((s) => s.setNotification)
  const setUser = useAuthStore((s) => s.setUser)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSocialLogin = async (provider) => {
    setError('')
    setSocialLoading(provider)
    const fn = provider === 'google' ? loginWithGoogle : loginWithApple
    const result = await fn()
    if (result.success) {
      setUser(result.user)
      setNotification(`Welcome, ${result.user.displayName || 'User'}!`)
      navigate('/')
    } else {
      setError(result.error)
    }
    setSocialLoading('')
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
    const result = await registerUser(formData.email, formData.password, formData.displayName)
    if (result.success) {
      setUser(result.user)
      setNotification(`Account created! Welcome, ${formData.displayName}!`)
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
          <p style={{ color: '#5a7a99', fontSize: 14, marginTop: 4 }}>Create your account</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255, 61, 61, 0.1)',
            border: '1px solid rgba(255, 61, 61, 0.3)',
            borderRadius: 8, padding: 12, marginBottom: 20,
            color: '#ff3d3d', fontSize: 13
          }}>
            {error}
          </div>
        )}

        {/* Social Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={!!socialLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '12px',
              background: socialLoading === 'google' ? '#ddd' : '#fff',
              border: 'none', borderRadius: 8,
              color: '#3c4043', fontSize: 14, fontWeight: 600,
              cursor: socialLoading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            <GoogleIcon />
            {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
          </button>

          <button
            onClick={() => handleSocialLogin('apple')}
            disabled={!!socialLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '12px',
              background: socialLoading === 'apple' ? '#333' : '#000',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: socialLoading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            <AppleIcon />
            {socialLoading === 'apple' ? 'Connecting...' : 'Continue with Apple'}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,200,255,0.15)' }} />
          <span style={{ color: '#5a7a99', fontSize: 12 }}>or register with email</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,200,255,0.15)' }} />
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>FULL NAME</label>
            <input type="text" name="displayName" value={formData.displayName}
              onChange={handleChange} required placeholder="John Doe" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" name="email" value={formData.email}
              onChange={handleChange} required placeholder="you@example.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" name="password" value={formData.password}
              onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword}
              onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px',
            background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
            border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#5a7a99', fontSize: 13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#00c8ff', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}