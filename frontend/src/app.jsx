import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { earthquakeService } from './services/api'
import { useAppStore } from './store/useAppStore'
import { useWebSocket } from './hooks'
import Sidebar from './components/Sidebar'
import { Notification } from './components/UI'
import Overview    from './pages/Overview'
import MapView     from './pages/MapView'
import Analytics   from './pages/Analytics'
import Predictions from './pages/Predictions'
import Forecasting from './pages/Forecasting'
import Chat        from './pages/Chat'
import LiveFeed    from './pages/LiveFeed'
import './styles/layout.css'

const PAGE_TITLES = {
  '/':            'Overview',
  '/map':         'Map View',
  '/analytics':   'Analytics',
  '/predictions': 'AI Predictions',
  '/forecasting': 'Forecasting',
  '/chat':        'AI Chat',
  '/live':        'USGS Live Feed',  // ← ADDED THIS
}

export default function App() {
  const location       = useLocation()
  const setHealth      = useAppStore((s) => s.setHealth)
  const notification   = useAppStore((s) => s.notification)

  // Connect WebSocket
  useWebSocket()

  // Health check on mount + every 30s
  useEffect(() => {
    const check = async () => {
      const h = await earthquakeService.getHealth().catch(() => null)
      setHealth(h)
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  const pageTitle = PAGE_TITLES[location.pathname] || 'SeismoIQ'
  const now       = new Date().toLocaleTimeString()

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="breadcrumb">SeismoIQ</span>
            <span className="breadcrumb-sep">›</span>
            <span className="page-title">{pageTitle}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-badge mono">{now}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Routes>
            <Route path="/"            element={<Overview />}    />
            <Route path="/map"         element={<MapView />}     />
            <Route path="/analytics"   element={<Analytics />}   />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/forecasting" element={<Forecasting />} />
            <Route path="/chat"        element={<Chat />}        />
            <Route path="/live"        element={<LiveFeed />}    />
          </Routes>
        </main>
      </div>

      <Notification msg={notification} />
    </div>
  )
}