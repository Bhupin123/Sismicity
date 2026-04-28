import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { subscribeToAlerts, unsubscribeFromAlerts, getUserPreferences } from '../services/firebase'

/* ── Primitives ─────────────────────────────────────────────────── */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: '#0d1b2a', border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: 14, padding: '20px', ...style,
  }}>{children}</div>
)

const SLabel = ({ children, style = {} }) => (
  <div style={{
    color: '#5a7a99', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.1em', marginBottom: 8,
    textTransform: 'uppercase', ...style,
  }}>{children}</div>
)

/* ── Magnitude data ─────────────────────────────────────────────── */
const MAG_LEVELS = [
  { label: 'Minor',    color: '#4fc3f7', bg: 'rgba(79,195,247,0.08)',   border: 'rgba(79,195,247,0.35)',   desc: 'Felt slightly',   range: '2.0–3.9' },
  { label: 'Light',    color: '#81c784', bg: 'rgba(129,199,132,0.08)',  border: 'rgba(129,199,132,0.35)',  desc: 'Felt by many',    range: '4.0–4.9' },
  { label: 'Moderate', color: '#ffb74d', bg: 'rgba(255,183,77,0.08)',   border: 'rgba(255,183,77,0.35)',   desc: 'Slight damage',   range: '5.0–5.9' },
  { label: 'Strong',   color: '#ff8a65', bg: 'rgba(255,138,101,0.08)',  border: 'rgba(255,138,101,0.35)',  desc: 'Significant dmg', range: '6.0–6.9' },
  { label: 'Major',    color: '#ef5350', bg: 'rgba(239,83,80,0.08)',    border: 'rgba(239,83,80,0.35)',    desc: 'Widespread dmg',  range: '7.0+' },
]

/* ── Radius presets ─────────────────────────────────────────────── */
const RADIUS_PRESETS = [
  { label: '50 km',   value: 50,   desc: 'Local' },
  { label: '100 km',  value: 100,  desc: 'City' },
  { label: '200 km',  value: 200,  desc: 'Regional' },
  { label: '500 km',  value: 500,  desc: 'Country' },
  { label: '1000 km', value: 1000, desc: 'Continental' },
]

/* ── Defaults (Kathmandu — updated to user's actual location) ───── */
const DEFAULTS = {
  alertsEnabled:      false,
  alertMagnitude:     5.0,
  selectedMagnitudes: ['Moderate', 'Strong', 'Major'],
  alertRadius:        200,
  userLat:            27.7172,
  userLon:            85.3240,
  locationName:       'Kathmandu, Nepal',
}

/* ── localStorage helpers ───────────────────────────────────────── */
const LS_KEY     = (uid) => `seismoiq_prefs_v2_${uid}`
const saveLocal  = (uid, d) => { try { localStorage.setItem(LS_KEY(uid), JSON.stringify(d)) } catch {} }
const loadLocal  = (uid)    => { try { return JSON.parse(localStorage.getItem(LS_KEY(uid)) || 'null') } catch { return null } }
const clearLocal = (uid)    => { try { localStorage.removeItem(LS_KEY(uid)) } catch {} }

/* ── Reverse geocode ────────────────────────────────────────────── */
const reverseGeocode = async (lat, lon) => {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const city =
      data.address?.city    ||
      data.address?.town    ||
      data.address?.village ||
      data.address?.county  ||
      data.address?.state   || ''
    const country = data.address?.country || ''
    return city && country
      ? `${city}, ${country}`
      : data.display_name?.split(',').slice(0, 2).join(',').trim() || ''
  } catch {
    return ''
  }
}

/* ── Auto-detect location silently on first load ────────────────── */
const detectLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: parseFloat(pos.coords.latitude.toFixed(4)),
        lon: parseFloat(pos.coords.longitude.toFixed(4)),
      }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    )
  })

/* ── Merge Firestore data with fallback ─────────────────────────── */
const mergeWithDefaults = (src, fallback = DEFAULTS) => ({
  alertsEnabled:      src.alertsEnabled      != null ? !!src.alertsEnabled                       : fallback.alertsEnabled,
  alertMagnitude:     src.alertMagnitude      != null ? Number(src.alertMagnitude)                : fallback.alertMagnitude,
  selectedMagnitudes: Array.isArray(src.selectedMagnitudes) && src.selectedMagnitudes.length > 0
                        ? src.selectedMagnitudes
                        : fallback.selectedMagnitudes,
  alertRadius:        src.alertRadius         != null ? Number(src.alertRadius)                   : fallback.alertRadius,
  userLat:            src.userLat             != null ? Number(src.userLat)                       : fallback.userLat,
  userLon:            src.userLon             != null ? Number(src.userLon)                       : fallback.userLon,
  locationName:       src.locationName != null && src.locationName !== ''
                        ? src.locationName
                        : fallback.locationName,
})

/* ── Sidebar badge ──────────────────────────────────────────────── */
export const AlertsNavBadge = ({ subscribed, selectedCount }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '2px 8px 2px 6px', borderRadius: 20,
    background: subscribed ? 'rgba(0,200,100,0.13)' : 'rgba(255,80,80,0.10)',
    border: `1px solid ${subscribed ? 'rgba(0,200,100,0.35)' : 'rgba(255,80,80,0.25)'}`,
    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
    color: subscribed ? '#00cc77' : '#ff6060', transition: 'all 0.3s',
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: subscribed ? '#00cc77' : '#ff6060',
      boxShadow: subscribed ? '0 0 6px #00cc77' : 'none',
      animation: subscribed ? 'pulse 2s infinite' : 'none', flexShrink: 0,
    }} />
    {subscribed ? (selectedCount > 0 ? `${selectedCount} active` : 'ON') : 'OFF'}
  </div>
)

/* ── Alert Summary Card ─────────────────────────────────────────── */
const AlertSummaryCard = ({ subscribed, selectedMagnitudes, radius }) => {
  const areaKm2     = Math.round(Math.PI * radius * radius)
  const highestRisk = [...selectedMagnitudes].sort((a, b) => {
    const order = ['Minor', 'Light', 'Moderate', 'Strong', 'Major']
    return order.indexOf(b) - order.indexOf(a)
  })[0]
  const riskMag = MAG_LEVELS.find(m => m.label === highestRisk)

  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', border: `1px solid ${subscribed ? 'rgba(0,200,100,0.1)' : 'rgba(0,200,255,0.07)'}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -10, right: -10, width: 80,  height: 80,  borderRadius: '50%', border: `1px solid ${subscribed ? 'rgba(0,200,100,0.07)' : 'rgba(0,200,255,0.05)'}`, pointerEvents: 'none' }} />

      <SLabel>Alert Summary</SLabel>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8, marginBottom: 14,
        background: subscribed ? 'rgba(0,180,90,0.07)' : 'rgba(255,60,60,0.07)',
        border: `1px solid ${subscribed ? 'rgba(0,180,90,0.2)' : 'rgba(255,60,60,0.2)'}`,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: subscribed ? '#00cc77' : '#ff5555',
          boxShadow: subscribed ? '0 0 8px #00cc77' : 'none',
          animation: subscribed ? 'pulse 2s infinite' : 'none',
        }} />
        <span style={{ color: subscribed ? '#00cc77' : '#ff5555', fontWeight: 700, fontSize: 12 }}>
          {subscribed ? 'Monitoring Active' : 'Not Monitoring'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Levels Watched', value: selectedMagnitudes.length > 0 ? `${selectedMagnitudes.length} / 5` : '—', color: '#00c8ff' },
          { label: 'Radius',         value: `${radius} km`,                                                            color: '#a78bfa' },
          { label: 'Coverage Area',  value: `~${areaKm2.toLocaleString()} km²`,                                        color: '#81c784' },
          { label: 'Highest Risk',   value: highestRisk || '—',                                                        color: riskMag?.color || '#5a7a99' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ color: '#3a5a79', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ color, fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {selectedMagnitudes.length > 0 ? (
        <div>
          <div style={{ color: '#3a5a79', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Watching</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedMagnitudes.map(label => {
              const m = MAG_LEVELS.find(x => x.label === label)
              return m ? (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20,
                  background: m.bg, border: `1px solid ${m.border}`,
                  fontSize: 11, fontWeight: 600, color: m.color,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                  {m.label}
                </div>
              ) : null
            })}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '10px', borderRadius: 8, textAlign: 'center',
          background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.15)',
          color: '#ff6060', fontSize: 11,
        }}>
           No magnitude levels selected
        </div>
      )}
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function Alerts() {
  const user = useAuthStore((s) => s.user)
  const uid  = user?.uid

  // Only show skeleton if no local cache at all — avoids slow first paint
  const [loading,            setLoading]            = useState(() => uid ? loadLocal(uid) === null : false)
  const [subscribed,         setSubscribed]         = useState(DEFAULTS.alertsEnabled)
  const [magnitude,          setMagnitude]          = useState(DEFAULTS.alertMagnitude)
  const [selectedMagnitudes, setSelectedMagnitudes] = useState(DEFAULTS.selectedMagnitudes)
  const [radius,             setRadius]             = useState(DEFAULTS.alertRadius)
  const [lat,                setLat]                = useState(DEFAULTS.userLat)
  const [lon,                setLon]                = useState(DEFAULTS.userLon)
  const [locationName,       setLocationName]       = useState(DEFAULTS.locationName)
  const [geoLoading,         setGeoLoading]         = useState(false)
  const [toast,              setToast]              = useState(null)
  const [btnState,           setBtnState]           = useState('idle') // idle | saving | saved | error
  const [syncing,            setSyncing]            = useState(false)

  const fetchedForUid = useRef(null)
  const prevUid       = useRef(null)

  const applyPrefs = (p) => {
    setSubscribed(p.alertsEnabled)
    setMagnitude(p.alertMagnitude)
    setSelectedMagnitudes(p.selectedMagnitudes)
    setRadius(p.alertRadius)
    setLat(p.userLat)
    setLon(p.userLon)
    setLocationName(p.locationName)
  }

  // ── Load preferences + auto-detect location if none saved ────────
  useEffect(() => {
    if (!uid) {
      if (prevUid.current) clearLocal(prevUid.current)
      applyPrefs(DEFAULTS)
      setLoading(false)
      fetchedForUid.current = null
      prevUid.current = null
      return
    }

    if (fetchedForUid.current === uid) return
    prevUid.current = uid

    // Step 1: Apply local cache immediately (zero delay)
    const cached = loadLocal(uid)
    if (cached) {
      applyPrefs(mergeWithDefaults(cached))
      setLoading(false)
    } else {
      setLoading(true)
    }

    // Step 2: Firestore sync in background + auto-detect real location
    setSyncing(true)
    Promise.all([
      getUserPreferences(uid),
      // Auto-detect real location if no cache or cache has default coords
      (!cached || (cached.userLat === DEFAULTS.userLat && cached.userLon === DEFAULTS.userLon))
        ? detectLocation()
        : Promise.resolve(null),
    ]).then(async ([res, geoPos]) => {
      let prefs = cached ? mergeWithDefaults(cached) : { ...DEFAULTS }

      // Apply Firestore data if available
      if (res.success && res.data && Object.keys(res.data).length > 0) {
        prefs = mergeWithDefaults(res.data)
      }

      // Override location with real GPS if it was the default/missing
      if (
        geoPos &&
        (prefs.userLat === DEFAULTS.userLat && prefs.userLon === DEFAULTS.userLon)
      ) {
        const name = await reverseGeocode(geoPos.lat, geoPos.lon)
        prefs.userLat      = geoPos.lat
        prefs.userLon      = geoPos.lon
        prefs.locationName = name || `${geoPos.lat}, ${geoPos.lon}`
      }

      applyPrefs(prefs)
      saveLocal(uid, prefs)
      fetchedForUid.current = uid
    })
    .catch(() => { fetchedForUid.current = uid })
    .finally(() => {
      setSyncing(false)
      setLoading(false)
    })
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Toast ────────────────────────────────────────────────────── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Build prefs object ───────────────────────────────────────── */
  const buildPrefs = (enabled) => ({
    alertsEnabled: enabled,
    alertMagnitude: magnitude,
    selectedMagnitudes,
    alertRadius: radius,
    userLat: lat,
    userLon: lon,
    locationName,
  })

  const toggleMagnitude = (label) =>
    setSelectedMagnitudes(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )

  const handleSelectAll = () =>
    setSelectedMagnitudes(
      selectedMagnitudes.length === MAG_LEVELS.length ? [] : MAG_LEVELS.map(m => m.label)
    )

  /* ── Manual location detect ───────────────────────────────────── */
  const handleGetLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(4))
        const newLon = parseFloat(pos.coords.longitude.toFixed(4))
        setLat(newLat)
        setLon(newLon)
        const name        = await reverseGeocode(newLat, newLon)
        const displayName = name || `${newLat}, ${newLon}`
        setLocationName(displayName)
        setGeoLoading(false)
        showToast(` ${displayName}`)
      },
      () => { setGeoLoading(false); showToast('Could not get location', 'error') }
    )
  }

  /* ── Save ─────────────────────────────────────────────────────── */
  // NOTE: No withTimeout() here — firebase.js already has an 8s hard timeout
  // on the Firestore write itself, and 15s on the backend fetch.
  const handleSave = async () => {
    if (!uid)                       { showToast('Not logged in', 'error'); return }
    if (!selectedMagnitudes.length) { showToast('Select at least one magnitude level', 'error'); return }

    setBtnState('saving')

    try {
      const result = await subscribeToAlerts(uid, {
        magnitude,
        selectedMagnitudes,
        radius,
        lat,
        lon,
        locationName,
      })

      if (result.success) {
        setSubscribed(true)
        saveLocal(uid, buildPrefs(true))
        setBtnState('saved')
        setTimeout(() => setBtnState('idle'), 2500)
        showToast(` Alerts enabled for ${selectedMagnitudes.length} level${selectedMagnitudes.length > 1 ? 's' : ''} within ${radius} km`)
      } else {
        setBtnState('error')
        setTimeout(() => setBtnState('idle'), 3000)
        showToast(result.error || 'Failed to save — please try again', 'error')
      }
    } catch {
      setBtnState('error')
      setTimeout(() => setBtnState('idle'), 3000)
      showToast('Failed to save — please try again', 'error')
    }
  }

  /* ── Disable ──────────────────────────────────────────────────── */
  const handleDisable = async () => {
    if (!uid) return
    setSubscribed(false)
    saveLocal(uid, buildPrefs(false))
    showToast('Alerts disabled')
    unsubscribeFromAlerts(uid).catch(() => {})
  }

  /* ── Derived ──────────────────────────────────────────────────── */
  const allSelected  = selectedMagnitudes.length === MAG_LEVELS.length
  const canSave      = selectedMagnitudes.length > 0
  const activePreset = RADIUS_PRESETS.find(p => p.value === radius)

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: '#0a1628',
    border: '1px solid rgba(0,200,255,0.2)', borderRadius: 8,
    color: '#e0e0e0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'monospace',
  }

  /* ── Save button appearance ───────────────────────────────────── */
  const btnBg = {
    saved:  'linear-gradient(135deg,#00aa55,#007733)',
    saving: 'rgba(0,200,255,0.25)',
    error:  'rgba(255,60,60,0.25)',
    idle:   canSave ? 'linear-gradient(135deg,#00c8ff,#0077aa)' : 'rgba(255,255,255,0.05)',
  }[btnState] || 'linear-gradient(135deg,#00c8ff,#0077aa)'

  const btnLabel = {
    saved:  ' Saved!',
    saving: ' Saving…',
    error:  ' Failed — try again',
    idle:   subscribed ? ' Update Settings' : ' Enable Alerts',
  }[btnState]

  /* ── Skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '4px 0', maxWidth: 900, margin: '0 auto' }}>
        <style>{`@keyframes shimmer { 0%{opacity:0.35} 50%{opacity:0.65} 100%{opacity:0.35} }`}</style>
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: 160, height: 22, borderRadius: 6, background: 'rgba(0,200,255,0.09)', animation: 'shimmer 1.5s infinite', marginBottom: 10 }} />
          <div style={{ width: 260, height: 13, borderRadius: 4, background: 'rgba(0,200,255,0.05)', animation: 'shimmer 1.5s infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[200, 260, 180, 220].map((h, i) => (
            <div key={i} style={{
              height: h, borderRadius: 14,
              background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.08)',
              animation: `shimmer 1.5s infinite ${i * 0.15}s`,
            }} />
          ))}
        </div>
        <div style={{ color: '#3a5a79', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
          Loading your settings…
        </div>
      </div>
    )
  }

  /* ── Main render ──────────────────────────────────────────────── */
  return (
    <div style={{ padding: '4px 0', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes toastIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .mag-chip:hover  { transform:translateY(-2px); filter:brightness(1.12); }
        .mag-chip:active { transform:scale(0.97); }
        .rad-btn:hover   { transform:translateY(-1px); filter:brightness(1.1); }
        .rad-btn:active  { transform:scale(0.96); }
        .mag-chip, .rad-btn { transition: all 0.16s ease !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '12px 18px', borderRadius: 10, maxWidth: 320,
          background: toast.type === 'error' ? '#881111' : '#005522',
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'toastIn 0.25s ease',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#e0e8f0', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Alert Settings</h1>
        <p style={{ color: '#5a7a99', fontSize: 13, margin: 0 }}>
          Settings saved to your account — syncs across all devices
          {syncing && <span style={{ color: '#00c8ff', marginLeft: 8, fontSize: 11 }}> Syncing…</span>}
        </p>
      </div>

      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 10, marginBottom: 16, flexWrap: 'wrap', gap: 8,
        background: subscribed ? 'rgba(0,180,90,0.08)' : 'rgba(255,60,60,0.08)',
        border: `1px solid ${subscribed ? 'rgba(0,180,90,0.3)' : 'rgba(255,60,60,0.3)'}`,
      }}>
        <div>
          <div style={{ color: subscribed ? '#00cc77' : '#ff5555', fontWeight: 700, fontSize: 13 }}>
            {subscribed ? '● Alerts Active' : '● Alerts Disabled'}
          </div>
          <div style={{ color: '#5a7a99', fontSize: 11, marginTop: 2 }}>
            {subscribed
              ? `${selectedMagnitudes.join(', ')} · ${radius} km · ${locationName}`
              : 'Configure settings and click Enable Alerts'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {subscribed && selectedMagnitudes.map(label => {
            const m = MAG_LEVELS.find(x => x.label === label)
            return m ? (
              <div key={label} style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, boxShadow: `0 0 5px ${m.color}` }} />
            ) : null
          })}
          <div style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: subscribed ? 'rgba(0,180,90,0.15)' : 'rgba(255,60,60,0.15)',
            color: subscribed ? '#00cc77' : '#ff5555',
          }}>
            {subscribed ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* ── LEFT column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email */}
          <Card>
            <SLabel>Notification Email</SLabel>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.15)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg,#00c8ff,#0077aa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#e0e8f0', fontSize: 13, fontWeight: 600 }}>{user?.displayName || 'User'}</div>
                <div style={{ color: '#5a7a99', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
              </div>
            </div>
          </Card>

          {/* Magnitude multi-select */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SLabel style={{ marginBottom: 0 }}>Alert Magnitude Levels</SLabel>
              <button onClick={handleSelectAll} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                border: '1px solid rgba(0,200,255,0.3)',
                background: allSelected ? 'rgba(0,200,255,0.15)' : 'transparent',
                color: allSelected ? '#00c8ff' : '#5a7a99',
                transition: 'all 0.2s', letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {allSelected ? ' All' : 'Select All'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {MAG_LEVELS.map(m => {
                const active = selectedMagnitudes.includes(m.label)
                return (
                  <button key={m.label} className="mag-chip" onClick={() => toggleMagnitude(m.label)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: 4, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${active ? m.border : 'rgba(255,255,255,0.06)'}`,
                    background: active ? m.bg : 'rgba(255,255,255,0.02)',
                    boxShadow: active ? `0 0 12px ${m.color}18` : 'none',
                    textAlign: 'left', position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 7, right: 8, width: 14, height: 14, borderRadius: '50%',
                      background: active ? m.color : 'rgba(255,255,255,0.08)',
                      border: `1.5px solid ${active ? m.color : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, color: '#000', fontWeight: 900, transition: 'all 0.18s',
                    }}>{active ? '' : ''}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: m.color,
                        boxShadow: active ? `0 0 6px ${m.color}` : 'none',
                        transition: 'box-shadow 0.18s', flexShrink: 0,
                      }} />
                      <span style={{ color: active ? m.color : '#5a7a99', fontSize: 12, fontWeight: 700, transition: 'color 0.18s' }}>{m.label}</span>
                    </div>
                    <div style={{ color: active ? '#8ab4cc' : '#3a5a79', fontSize: 10, fontFamily: 'monospace', paddingLeft: 14 }}>M {m.range}</div>
                    <div style={{ color: active ? '#6a9ab8' : '#2e4a60', fontSize: 10, paddingLeft: 14 }}>{m.desc}</div>
                  </button>
                )
              })}
            </div>

            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#5a7a99', fontSize: 11 }}>
                {selectedMagnitudes.length === 0
                  ? 'No levels selected'
                  : `${selectedMagnitudes.length} level${selectedMagnitudes.length > 1 ? 's' : ''} selected`}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {MAG_LEVELS.map(m => (
                  <div key={m.label} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: selectedMagnitudes.includes(m.label) ? m.color : 'rgba(255,255,255,0.08)',
                    boxShadow: selectedMagnitudes.includes(m.label) ? `0 0 4px ${m.color}` : 'none',
                    transition: 'all 0.2s',
                  }} />
                ))}
              </div>
            </div>
          </Card>

          {/* Alert Radius */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SLabel style={{ marginBottom: 0 }}>Alert Radius</SLabel>
              <span style={{ color: '#a78bfa', fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
                {radius} km
                {activePreset && (
                  <span style={{ color: '#5a7a99', fontSize: 10, fontWeight: 400, marginLeft: 6 }}>· {activePreset.desc}</span>
                )}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {RADIUS_PRESETS.map((p, i) => {
                const active   = radius === p.value
                const ringSize = 18 + i * 5
                return (
                  <button key={p.value} className="rad-btn" onClick={() => setRadius(p.value)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${active ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    background: active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.02)',
                    boxShadow: active ? '0 0 14px rgba(167,139,250,0.15)' : 'none',
                  }}>
                    <div style={{
                      width: ringSize, height: ringSize, borderRadius: '50%',
                      border: `1.5px solid ${active ? '#a78bfa' : 'rgba(167,139,250,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: active ? '#a78bfa' : 'rgba(167,139,250,0.25)',
                        boxShadow: active ? '0 0 6px #a78bfa' : 'none',
                      }} />
                    </div>
                    <span style={{ color: active ? '#a78bfa' : '#5a7a99', fontSize: 9, fontWeight: 700, fontFamily: 'monospace', transition: 'color 0.15s', textAlign: 'center' }}>
                      {p.label}
                    </span>
                    <span style={{ color: active ? '#7a6ab8' : '#2e4a60', fontSize: 9, transition: 'color 0.15s' }}>
                      {p.desc}
                    </span>
                  </button>
                )
              })}
            </div>
            <p style={{ color: '#3a5a79', fontSize: 11, margin: '12px 0 0' }}>
              Earthquakes within this distance from your location will trigger alerts.
            </p>
          </Card>
        </div>

        {/* ── RIGHT column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Location */}
          <Card>
            <SLabel>Your Location</SLabel>

            <button onClick={handleGetLocation} disabled={geoLoading} style={{
              width: '100%', padding: '10px',
              background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.25)',
              borderRadius: 8, color: '#00c8ff', fontSize: 13, fontWeight: 600,
              cursor: geoLoading ? 'wait' : 'pointer', marginBottom: 12,
            }}>
              {geoLoading ? ' Detecting…' : ' Use My Current Location'}
            </button>

            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.10)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15 }}></span>
                <span style={{ color: '#c0dff0', fontSize: 13, fontWeight: 600 }}>{locationName}</span>
              </div>
              <div style={{ display: 'flex', gap: 20, paddingLeft: 24 }}>
                <div>
                  <span style={{ color: '#3a5a79', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lat </span>
                  <span style={{ color: '#00c8ff', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{lat}</span>
                </div>
                <div>
                  <span style={{ color: '#3a5a79', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lon </span>
                  <span style={{ color: '#00c8ff', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{lon}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Latitude',  value: lat, fn: (v) => { setLat(v); setLocationName(`${v}, ${lon}`) } },
                { label: 'Longitude', value: lon, fn: (v) => { setLon(v); setLocationName(`${lat}, ${v}`) } },
              ].map(({ label, value, fn }) => (
                <div key={label}>
                  <SLabel>{label}</SLabel>
                  <input
                    type="number" value={value} step="0.0001"
                    onChange={e => fn(parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <p style={{ color: '#3a5a79', fontSize: 11, margin: '8px 0 0' }}>
              Location auto-detected from your browser on first load.
            </p>
          </Card>

          {/* Alert Summary */}
          <AlertSummaryCard
            subscribed={subscribed}
            selectedMagnitudes={selectedMagnitudes}
            radius={radius}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={!canSave || btnState === 'saving'}
              style={{
                width: '100%', padding: '14px', border: 'none', borderRadius: 10,
                background: btnBg,
                color: !canSave ? '#3a5a79' : '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: (!canSave || btnState === 'saving') ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s',
                boxShadow: canSave && btnState === 'idle' ? '0 4px 16px rgba(0,200,255,0.2)' : 'none',
              }}
            >
              {btnLabel}
            </button>

            {subscribed && (
              <button onClick={handleDisable} style={{
                width: '100%', padding: '12px', background: 'transparent',
                border: '1px solid rgba(255,80,80,0.4)', borderRadius: 10,
                color: '#ff6060', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Disable Alerts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}