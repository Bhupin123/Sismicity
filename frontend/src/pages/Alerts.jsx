import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { subscribeToAlerts, unsubscribeFromAlerts, getUserPreferences } from '../services/firebase'

const Card = ({ children, style = {} }) => (
  <div style={{
    background: '#0d1b2a', border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: 14, padding: '24px 28px', ...style
  }}>{children}</div>
)

const SLabel = ({ children }) => (
  <div style={{
    color: '#5a7a99', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase'
  }}>{children}</div>
)

const RangeSlider = ({ label, value, min, max, step, onChange, unit, color }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <SLabel>{label}</SLabel>
      <span style={{ color, fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>
        {value}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
      <span style={{ color: '#3a5a79', fontSize: 11 }}>{min}{unit}</span>
      <span style={{ color: '#3a5a79', fontSize: 11 }}>{max}{unit}</span>
    </div>
  </div>
)

const MAG_LEVELS = [
  { label: 'Minor',    color: '#4fc3f7', desc: 'Felt slightly',     min: 2.0, max: 3.9, range: '2.0–3.9' },
  { label: 'Light',    color: '#81c784', desc: 'Felt by many',       min: 4.0, max: 4.9, range: '4.0–4.9' },
  { label: 'Moderate', color: '#ffb74d', desc: 'Slight damage',      min: 5.0, max: 5.9, range: '5.0–5.9' },
  { label: 'Strong',   color: '#ff8a65', desc: 'Significant damage', min: 6.0, max: 6.9, range: '6.0–6.9' },
  { label: 'Major',    color: '#ef5350', desc: 'Widespread damage',  min: 7.0, max: 99,  range: '7.0+'   },
]

// ── localStorage helpers ──────────────────────────────────────────────
const LS_KEY = (uid) => `seismoiq_prefs_${uid}`

const saveLocal = (uid, data) => {
  try { localStorage.setItem(LS_KEY(uid), JSON.stringify(data)) } catch {}
}

const loadLocal = (uid) => {
  try { return JSON.parse(localStorage.getItem(LS_KEY(uid)) || 'null') } catch { return null }
}

// ── Defaults ──────────────────────────────────────────────────────────
const DEFAULTS = {
  alertsEnabled:  false,
  alertMagnitude: 5.0,
  alertRadius:    200,
  userLat:        27.7172,
  userLon:        85.3240,
}

export default function Alerts() {
  const user = useAuthStore((s) => s.user)
  const uid  = user?.uid

  // Start from localStorage (instant) — will be overwritten by Firestore
  const local = uid ? (loadLocal(uid) || DEFAULTS) : DEFAULTS

  const [subscribed, setSubscribed] = useState(local.alertsEnabled)
  const [magnitude,  setMagnitude]  = useState(local.alertMagnitude)
  const [radius,     setRadius]     = useState(local.alertRadius)
  const [lat,        setLat]        = useState(local.userLat ?? DEFAULTS.userLat)
  const [lon,        setLon]        = useState(local.userLon ?? DEFAULTS.userLon)
  const [geoLoading, setGeoLoading] = useState(false)
  const [toast,      setToast]      = useState(null)
  const [btnState,   setBtnState]   = useState('idle')
  const [syncing,    setSyncing]    = useState(false)

  // ── Load from Firestore on mount / user change ────────────────────
  useEffect(() => {
    if (!uid) return
    setSyncing(true)
    getUserPreferences(uid)
      .then(res => {
        if (res.success && res.data) {
          const d = res.data
          const prefs = {
            alertsEnabled:  !!d.alertsEnabled,
            alertMagnitude: d.alertMagnitude ?? DEFAULTS.alertMagnitude,
            alertRadius:    d.alertRadius    ?? DEFAULTS.alertRadius,
            userLat:        d.userLat        ?? DEFAULTS.userLat,
            userLon:        d.userLon        ?? DEFAULTS.userLon,
          }
          // Update state from Firestore
          setSubscribed(prefs.alertsEnabled)
          setMagnitude(prefs.alertMagnitude)
          setRadius(prefs.alertRadius)
          setLat(prefs.userLat)
          setLon(prefs.userLon)
          // Save to localStorage for next refresh
          saveLocal(uid, prefs)
        }
      })
      .catch(() => {})
      .finally(() => setSyncing(false))
  }, [uid])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(parseFloat(pos.coords.latitude.toFixed(4)))
        setLon(parseFloat(pos.coords.longitude.toFixed(4)))
        setGeoLoading(false)
        showToast('Location detected!')
      },
      () => { setGeoLoading(false); showToast('Could not get location', 'error') }
    )
  }

  const handleSave = () => {
    if (!uid) { showToast('Not logged in', 'error'); return }

    const prefs = {
      alertsEnabled:  true,
      alertMagnitude: magnitude,
      alertRadius:    radius,
      userLat:        lat,
      userLon:        lon,
    }

    // 1. Update UI instantly (optimistic)
    setSubscribed(true)
    setBtnState('saved')
    setTimeout(() => setBtnState('idle'), 2500)
    showToast(`Alerts enabled! M${magnitude}+ within ${radius}km`)

    // 2. Save to localStorage immediately (survives refresh)
    saveLocal(uid, prefs)

    // 3. Sync to Firestore in background (survives logout/login)
    subscribeToAlerts(uid, { magnitude, radius, lat, lon })
      .catch(err => console.warn('Firestore sync failed:', err))
  }

  const handleDisable = () => {
    if (!uid) return

    // 1. Update UI instantly
    setSubscribed(false)
    showToast('Alerts disabled')

    // 2. Update localStorage
    saveLocal(uid, { ...(loadLocal(uid) || DEFAULTS), alertsEnabled: false })

    // 3. Sync to Firestore in background
    unsubscribeFromAlerts(uid).catch(() => {})
  }

  const activeMag = MAG_LEVELS.find(m => magnitude >= m.min && magnitude <= m.max) || MAG_LEVELS[4]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '14px 22px', borderRadius: 10,
          background: toast.type === 'error' ? '#881111' : '#005522',
          color: '#fff', fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#e0e8f0', fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>
           Alert Settings
        </h1>
        <p style={{ color: '#5a7a99', fontSize: 14, margin: 0 }}>
          Settings are saved to your account and persist across sessions
          {syncing && <span style={{ color: '#00c8ff', marginLeft: 8, fontSize: 12 }}>⟳ Syncing...</span>}
        </p>
      </div>

      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 22px', borderRadius: 12, marginBottom: 24,
        background: subscribed ? 'rgba(0,180,90,0.08)' : 'rgba(255,60,60,0.08)',
        border: `1px solid ${subscribed ? 'rgba(0,180,90,0.3)' : 'rgba(255,60,60,0.3)'}`,
      }}>
        <div>
          <div style={{ color: subscribed ? '#00cc77' : '#ff5555', fontWeight: 700, fontSize: 14 }}>
            {subscribed ? '✅ Alerts Active' : ' Alerts Disabled'}
          </div>
          <div style={{ color: '#5a7a99', fontSize: 12, marginTop: 2 }}>
            {subscribed
              ? `Monitoring M${magnitude}+ within ${radius}km of (${lat}, ${lon})`
              : 'Configure your settings and click Enable Alerts'}
          </div>
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: subscribed ? 'rgba(0,180,90,0.15)' : 'rgba(255,60,60,0.15)',
          color: subscribed ? '#00cc77' : '#ff5555',
        }}>
          {subscribed ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Card>
            <SLabel>Notification Email</SLabel>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 8,
              background: 'rgba(0,200,255,0.05)',
              border: '1px solid rgba(0,200,255,0.15)',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg,#00c8ff,#0077aa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#e0e8f0', fontSize: 14, fontWeight: 600 }}>
                  {user?.displayName || 'User'}
                </div>
                <div style={{ color: '#5a7a99', fontSize: 12 }}>{user?.email}</div>
              </div>
            </div>
          </Card>

          <Card>
            <RangeSlider
              label="Minimum Magnitude" value={magnitude}
              min={2} max={8} step={0.5} onChange={setMagnitude}
              unit="" color="#00c8ff"
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8,
              background: `${activeMag.color}12`,
              border: `1px solid ${activeMag.color}35`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeMag.color }} />
              <span style={{ color: activeMag.color, fontWeight: 700, fontSize: 13 }}>{activeMag.label}</span>
              <span style={{ color: '#5a7a99', fontSize: 12 }}>— {activeMag.desc}</span>
            </div>
          </Card>

          <Card>
            <RangeSlider
              label="Alert Radius" value={radius}
              min={50} max={1000} step={50} onChange={setRadius}
              unit=" km" color="#a78bfa"
            />
            <p style={{ color: '#3a5a79', fontSize: 12, margin: 0 }}>
              Earthquakes within this distance will trigger alerts.
            </p>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Card>
            <SLabel>Your Location</SLabel>
            <button
              onClick={handleGetLocation} disabled={geoLoading}
              style={{
                width: '100%', padding: '11px',
                background: 'rgba(0,200,255,0.08)',
                border: '1px solid rgba(0,200,255,0.25)',
                borderRadius: 8, color: '#00c8ff',
                fontSize: 13, fontWeight: 600,
                cursor: geoLoading ? 'wait' : 'pointer', marginBottom: 14,
              }}
            >
              {geoLoading ? ' Detecting...' : ' Use My Current Location'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Latitude',  value: lat, fn: setLat },
                { label: 'Longitude', value: lon, fn: setLon },
              ].map(({ label, value, fn }) => (
                <div key={label}>
                  <SLabel>{label}</SLabel>
                  <input
                    type="number" value={value} step="0.0001"
                    onChange={e => fn(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: '#0a1628',
                      border: '1px solid rgba(0,200,255,0.2)',
                      borderRadius: 8, color: '#e0e0e0',
                      fontSize: 13, outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'monospace',
                    }}
                  />
                </div>
              ))}
            </div>
            <p style={{ color: '#3a5a79', fontSize: 12, margin: '10px 0 0' }}>
              Default: Kathmandu, Nepal
            </p>
          </Card>

          <Card>
            <SLabel>Magnitude Scale Reference</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {MAG_LEVELS.map(m => (
                <div key={m.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 6,
                  background: activeMag.label === m.label ? `${m.color}14` : 'transparent',
                  border: `1px solid ${activeMag.label === m.label ? m.color + '50' : m.color + '18'}`,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                  <span style={{ color: '#5a7a99', fontSize: 11, fontFamily: 'monospace', width: 72 }}>M {m.range}</span>
                  <span style={{ color: m.color, fontSize: 12, fontWeight: 700, width: 68 }}>{m.label}</span>
                  <span style={{ color: '#3a5a79', fontSize: 11 }}>{m.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleSave}
              style={{
                width: '100%', padding: '15px', border: 'none', borderRadius: 10,
                background: btnState === 'saved'
                  ? 'linear-gradient(135deg,#00aa55,#007733)'
                  : 'linear-gradient(135deg,#00c8ff,#0077aa)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.3s',
                boxShadow: '0 4px 16px rgba(0,200,255,0.2)',
              }}
            >
              {btnState === 'saved' ? ' Saved!' : subscribed ? ' Update Settings' : ' Enable Alerts'}
            </button>

            {subscribed && (
              <button
                onClick={handleDisable}
                style={{
                  width: '100%', padding: '13px',
                  background: 'transparent',
                  border: '1px solid rgba(255,80,80,0.4)',
                  borderRadius: 10, color: '#ff6060',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                 Disable Alerts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}