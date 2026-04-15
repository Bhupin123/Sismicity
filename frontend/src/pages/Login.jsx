import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser, loginWithGoogle, sendPhoneOTP, verifyPhoneOTP, resetPassword } from '../services/firebase'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
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

// Tabs: 'email' | 'phone' | 'forgot'
export default function Login() {
  const [tab, setTab] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const setNotification = useAppStore((s) => s.setNotification)
  const setUser = useAuthStore((s) => s.setUser)

  const switchTab = (t) => {
    setTab(t)
    setError('')
    setSuccess('')
    setOtpSent(false)
    setForgotSent(false)
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

  // ── Email login ─────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await loginUser(email, password)
    if (result.success) {
      setUser(result.user)
      setNotification(`Welcome back, ${result.user.displayName || 'User'}!`)
      navigate('/')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // ── Forgot password ─────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!forgotEmail.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    const result = await resetPassword(forgotEmail.trim())
    if (result.success) {
      setForgotSent(true)
      setSuccess(`Password reset email sent to ${forgotEmail}. Check your inbox (and spam folder).`)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // ── Phone: send OTP ─────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) {
      setError('Please enter a phone number.')
      return
    }
    setLoading(true)
    const result = await sendPhoneOTP(phone.trim(), 'recaptcha-container')
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
    if (!otp.trim()) {
      setError('Please enter the OTP.')
      return
    }
    setLoading(true)
    const result = await verifyPhoneOTP(otp.trim())
    if (result.success) {
      setUser(result.user)
      setNotification(`Welcome!`)
      navigate('/')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // ── Tab button style ────────────────────────────────────────────
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
      {/* Invisible recaptcha container — must always be in DOM */}
      <div id="recaptcha-container" />

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
          <div style={{ fontSize: 44, marginBottom: 6 }}></div>
          <h1 style={{ color: '#00c8ff', fontSize: 30, margin: 0 }}>SeismoIQ</h1>
          <p style={{ color: '#5a7a99', fontSize: 13, marginTop: 4 }}>Sign in to your account</p>
        </div>

        {/* Google button — always visible */}
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
          <span style={{ color: '#5a7a99', fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,200,255,0.15)' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid rgba(0,200,255,0.1)' }}>
          <button style={tabStyle('email')} onClick={() => switchTab('email')}>Email</button>
          <button style={tabStyle('phone')} onClick={() => switchTab('phone')}> Phone</button>
          <button style={tabStyle('forgot')} onClick={() => switchTab('forgot')}>Forgot?</button>
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
          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com" style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>PASSWORD</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required placeholder="••••••••" style={inputStyle}
              />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button type="button" onClick={() => switchTab('forgot')}
                style={{ background: 'none', border: 'none', color: '#00c8ff', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', boxSizing: 'border-box'
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
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

                  <PhoneInput
                    country={'np'}
                    value={phone}
                    onChange={(value) => setPhone('+' + value)}

                    containerStyle={{ width: '100%' }}

                    inputStyle={{
                      width: '100%',
                      height: '44px',
                      background: 'var(--raised)',
                      border: '1px solid var(--bdr2)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--txt)',
                      fontSize: '14px',
                      paddingLeft: '48px'
                    }}

                    buttonStyle={{
                      background: 'var(--raised)',
                      border: '1px solid var(--bdr2)',
                      borderRadius: 'var(--radius)',
                      borderRight: 'none'
                    }}

                    dropdownStyle={{
                      background: 'var(--panel)',
                      color: 'var(--txt)',
                      border: '1px solid var(--border)'
                    }}
                  />

                  <p style={{ color: '#5a7a99', fontSize: 11, marginTop: 6 }}>
                    Include country code automatically
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
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setSuccess(''); setError('') }}
                  style={{
                    width: '100%', marginTop: 10, padding: '10px', background: 'transparent',
                    border: '1px solid rgba(0,200,255,0.2)', borderRadius: 8, color: '#5a7a99',
                    fontSize: 13, cursor: 'pointer'
                  }}>
                  ← Change number / Resend
                </button>
              </form>
            )}
          </>
        )}

        {/* ── FORGOT PASSWORD TAB ── */}
        {tab === 'forgot' && (
          <>
            {!forgotSent ? (
              <form onSubmit={handleForgotPassword}>
                <p style={{ color: '#5a7a99', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>EMAIL</label>
                  <input
                    type="email" value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required placeholder="you@example.com" style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '14px',
                  background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
                  border: 'none', borderRadius: 8, color: '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', boxSizing: 'border-box'
                }}>
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}></div>
                <p style={{ color: '#00c864', fontSize: 14, marginBottom: 16 }}>
                  Reset link sent! Check your inbox and spam folder.
                </p>
                <button onClick={() => switchTab('email')}
                  style={{ background: 'none', border: 'none', color: '#00c8ff', fontSize: 13, cursor: 'pointer' }}>
                  ← Back to Sign In
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, color: '#5a7a99', fontSize: 13 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#00c8ff', textDecoration: 'none', fontWeight: 600 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}