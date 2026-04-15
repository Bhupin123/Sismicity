import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, loginWithGoogle, sendPhoneOTP, verifyPhoneOTP } from '../services/firebase'
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

// Tabs: 'email' | 'phone'
export default function Register() {
  const [tab, setTab]             = useState('email')
  const [formData, setFormData]   = useState({ displayName: '', email: '', password: '', confirmPassword: '' })
  const [phone, setPhone]         = useState('')
  const [otp, setOtp]             = useState('')
  const [otpSent, setOtpSent]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const navigate                  = useNavigate()
  const setNotification           = useAppStore((s) => s.setNotification)
  const setUser                   = useAuthStore((s) => s.setUser)

  const switchTab = (t) => {
    setTab(t); setError(''); setSuccess(''); setOtpSent(false)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // ── Google ──────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    const result = await loginWithGoogle()
    if (result.success) {
      setUser(result.user)
      setNotification(`Welcome, ${result.user.displayName || 'User'}!`)
      navigate('/')
    } else {
      setError(result.error)
    }
    setGoogleLoading(false)
  }

  // ── Email register ───────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.')
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

  // ── Phone: send OTP ─────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) { setError('Please enter a phone number.'); return }
    setLoading(true)
    const result = await sendPhoneOTP(phone.trim(), 'recaptcha-container-register')
    if (result.success) {
      setOtpSent(true)
      setSuccess('OTP sent! Check your SMS.')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // ── Phone: verify OTP ───────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!otp.trim()) { setError('Please enter the OTP.'); return }
    setLoading(true)
    const result = await verifyPhoneOTP(otp.trim())
    if (result.success) {
      setUser(result.user)
      setNotification('Account created!')
      navigate('/')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const tabStyle = (t) => ({
    flex: 1,
    padding: '10px 0',
    background: tab === t ? 'rgba(0,200,255,0.15)' : 'transparent',
    border: 'none',
    borderBottom: tab === t ? '2px solid #00c8ff' : '2px solid transparent',
    color: tab === t ? '#00c8ff' : '#5a7a99',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.3px'
  })

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628 0%, #1e2535 100%)',
      padding: 20
    }}>
      {/* Invisible recaptcha container */}
      <div id="recaptcha-container-register" />

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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🌍</div>
          <h1 style={{ color: '#00c8ff', fontSize: 30, margin: 0 }}>SeismoIQ</h1>
          <p style={{ color: '#5a7a99', fontSize: 13, marginTop: 4 }}>Create your account</p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '12px',
            background: googleLoading ? '#ddd' : '#fff',
            border: 'none', borderRadius: 8,
            color: '#3c4043', fontSize: 14, fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            marginBottom: 20, transition: 'opacity 0.2s'
          }}
        >
          <GoogleIcon />
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,200,255,0.15)' }} />
          <span style={{ color: '#5a7a99', fontSize: 12 }}>or register with</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,200,255,0.15)' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid rgba(0,200,255,0.1)' }}>
          <button style={tabStyle('email')} onClick={() => switchTab('email')}>Email</button>
          <button style={tabStyle('phone')} onClick={() => switchTab('phone')}>📱 Phone</button>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.3)',
            borderRadius: 8, padding: 12, marginBottom: 16, color: '#ff3d3d', fontSize: 13
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)',
            borderRadius: 8, padding: 12, marginBottom: 16, color: '#00c864', fontSize: 13
          }}>
            {success}
          </div>
        )}

        {/* ── EMAIL TAB ── */}
        {tab === 'email' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>FULL NAME</label>
              <input type="text" name="displayName" value={formData.displayName}
                onChange={handleChange} required placeholder="John Doe" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>EMAIL</label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} required placeholder="you@example.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', boxSizing: 'border-box'
            }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* ── PHONE TAB ── */}
        {tab === 'phone' && (
          <>
            {!otpSent ? (
              <form onSubmit={handleSendOTP}>
                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>PHONE NUMBER</label>
                  <input
                    type="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required placeholder="+1 234 567 8900" style={inputStyle}
                  />
                  <p style={{ color: '#5a7a99', fontSize: 11, marginTop: 6, marginBottom: 0 }}>
                    Include country code, e.g. +977 for Nepal
                  </p>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: '14px',
                    background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', boxSizing: 'border-box'
                  }}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <p style={{ color: '#5a7a99', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
                  Enter the 6-digit code sent to <strong style={{ color: '#e0e0e0' }}>{phone}</strong>
                </p>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>OTP CODE</label>
                  <input
                    type="text" value={otp} maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required placeholder="123456"
                    style={{ ...inputStyle, letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '14px',
                  background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
                  border: 'none', borderRadius: 8, color: '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', boxSizing: 'border-box'
                }}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setSuccess(''); setError('') }}
                  style={{ width: '100%', marginTop: 10, padding: '10px', background: 'transparent',
                    border: '1px solid rgba(0,200,255,0.2)', borderRadius: 8, color: '#5a7a99',
                    fontSize: 13, cursor: 'pointer' }}>
                  ← Change number / Resend
                </button>
              </form>
            )}
          </>
        )}

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