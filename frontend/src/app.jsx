import React, { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, logoutUser } from './services/firebase'
import { earthquakeService } from './services/api'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'
import { useWebSocket } from './hooks'
import Sidebar         from './components/Sidebar'
import { Notification } from './components/UI'
import ProtectedRoute  from './components/ProtectedRoute'
import Overview    from './pages/Overview'
import MapView     from './pages/MapView'
import Analytics   from './pages/Analytics'
import Predictions from './pages/Predictions'
import Forecasting from './pages/Forecasting'
import Chat        from './pages/Chat'
import LiveFeed    from './pages/LiveFeed'
import Alerts      from './pages/Alerts'
import Login       from './pages/Login'
import Register    from './pages/Register'
import './styles/layout.css'

const PAGE_TITLES = {
  '/':            'Overview',
  '/map':         'Map View',
  '/analytics':   'Analytics',
  '/predictions': 'AI Predictions',
  '/forecasting': 'Forecasting',
  '/chat':        'AI Chat',
  '/live':        'USGS Live Feed',
  '/alerts':      'Alert Settings',
}

function PublicRoute({ children }) {
  const user        = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  if (!initialized) return null
  if (user) return <Navigate to="/" replace />
  return children
}

function AppLayout() {
  const location        = useLocation()
  const navigate        = useNavigate()
  const setHealth       = useAppStore((s) => s.setHealth)
  const notification    = useAppStore((s) => s.notification)
  const setNotification = useAppStore((s) => s.setNotification)
  const user            = useAuthStore((s) => s.user)
  const clearUser       = useAuthStore((s) => s.clearUser)

  useWebSocket()

  useEffect(() => {
    const check = async () => {
      const h = await earthquakeService.getHealth().catch(() => null)
      setHealth(h)
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    await logoutUser()
    clearUser()
    setNotification('👋 Logged out successfully')
    navigate('/login')
  }

  const pageTitle = PAGE_TITLES[location.pathname] || 'SeismoIQ'
  const now       = new Date().toLocaleTimeString()

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="breadcrumb">SeismoIQ</span>
            <span className="breadcrumb-sep">›</span>
            <span className="page-title">{pageTitle}</span>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="topbar-badge mono">{now}</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 10px',
              background: 'rgba(0,200,255,0.07)',
              border: '1px solid rgba(0,200,255,0.15)',
              borderRadius: 8,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg,#00c8ff,#0099cc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#0a1628', flexShrink: 0,
              }}>
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{
                color: '#b0c8e0', fontSize: 13,
                maxWidth: 140, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.displayName || user?.email || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 14px', background: 'transparent',
                border: '1px solid rgba(255,80,80,0.35)',
                borderRadius: 6, color: '#ff6060',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.35)' }}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/"            element={<ProtectedRoute><Overview /></ProtectedRoute>}    />
            <Route path="/map"         element={<ProtectedRoute><MapView /></ProtectedRoute>}     />
            <Route path="/analytics"   element={<ProtectedRoute><Analytics /></ProtectedRoute>}   />
            <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
            <Route path="/forecasting" element={<ProtectedRoute><Forecasting /></ProtectedRoute>} />
            <Route path="/chat"        element={<ProtectedRoute><Chat /></ProtectedRoute>}        />
            <Route path="/live"        element={<ProtectedRoute><LiveFeed /></ProtectedRoute>}    />
            <Route path="/alerts"      element={<ProtectedRoute><Alerts /></ProtectedRoute>}      />
            <Route path="*"            element={<Navigate to="/" replace />}                     />
          </Routes>
        </main>
      </div>
      <Notification msg={notification} />
    </div>
  )
}

function AuthSplash() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0a1628',
      flexDirection: 'column', gap: 16
    }}>
      <div style={{ fontSize: 52 }}>🌋</div>
      <div style={{ color: '#00c8ff', fontSize: 18, fontWeight: 600 }}>Loading SeismoIQ...</div>
    </div>
  )
}

export default function App() {
  const setUser     = useAuthStore((s) => s.setUser)
  const clearUser   = useAuthStore((s) => s.clearUser)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) setUser(firebaseUser)
      else clearUser()
    })
    return () => unsubscribe()
  }, [])

  if (!initialized) return <AuthSplash />

  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>}    />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/*"        element={<AppLayout />}                          />
    </Routes>
  )
}