import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function ProtectedRoute({ children }) {
  const user        = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)

  // Wait until Firebase has responded at least once before making a decision
  if (!initialized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a1628',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ fontSize: 52 }}>🌋</div>
        <div style={{ color: '#00c8ff', fontSize: 18, fontWeight: 600 }}>
          Loading SeismoIQ...
        </div>
        <div style={{ color: '#5a7a99', fontSize: 13 }}>
          Checking authentication
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}