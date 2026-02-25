import React, { useState, useEffect } from 'react'
import { auth } from '../services/firebase'
import { subscribeToAlerts, getUserPreferences } from '../services/firebase'

export default function Settings() {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({
    magnitude: 5.0,
    radius: 100,
    lat: 28.0,
    lon: 84.0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user)
      if (user) {
        const prefs = await getUserPreferences(user.uid)
        if (prefs.success) {
          setSettings({
            magnitude: prefs.data.alertMagnitude || 5.0,
            radius: prefs.data.alertRadius || 100,
            lat: prefs.data.userLat || 28.0,
            lon: prefs.data.userLon || 84.0
          })
        }
      }
    })
    return unsubscribe
  }, [])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    
    const result = await subscribeToAlerts(user.uid, settings)
    
    if (result.success) {
      alert('✅ Alert settings saved!')
    } else {
      alert('❌ Failed to save settings')
    }
    
    setLoading(false)
  }

  if (!user) return <div>Please log in</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Alert Settings</h2>
      
      <div style={{ maxWidth: 600 }}>
        <label>Minimum Magnitude</label>
        <select 
          value={settings.magnitude} 
          onChange={(e) => setSettings({...settings, magnitude: Number(e.target.value)})}
        >
          <option value={3.0}>M 3.0+</option>
          <option value={4.0}>M 4.0+</option>
          <option value={5.0}>M 5.0+</option>
          <option value={6.0}>M 6.0+</option>
        </select>
        
        <label>Alert Radius (km)</label>
        <input 
          type="number" 
          value={settings.radius}
          onChange={(e) => setSettings({...settings, radius: Number(e.target.value)})}
        />
        
        <label>Your Latitude</label>
        <input 
          type="number" 
          step="0.1"
          value={settings.lat}
          onChange={(e) => setSettings({...settings, lat: Number(e.target.value)})}
        />
        
        <label>Your Longitude</label>
        <input 
          type="number" 
          step="0.1"
          value={settings.lon}
          onChange={(e) => setSettings({...settings, lon: Number(e.target.value)})}
        />
        
        <button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Alert Settings'}
        </button>
      </div>
    </div>
  )
}