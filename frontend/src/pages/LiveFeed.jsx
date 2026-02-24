import React, { useState, useEffect } from 'react'

export default function LiveFeed() {
  const [usgsData, setUsgsData] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState(null)
  const [hours, setHours] = useState(24)
  const [minMag, setMinMag] = useState(2.5)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchUSGS = async () => {
    setLoading(true)
    try {
      const endTime = new Date()
      const startTime = new Date(endTime - hours * 60 * 60 * 1000)
      
      const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime.toISOString()}&endtime=${endTime.toISOString()}&minmagnitude=${minMag}&orderby=time-asc`
      
      const response = await fetch(url)
      const data = await response.json()
      
      const earthquakes = data.features.map(feature => ({
        time: new Date(feature.properties.time),
        mag: feature.properties.mag,
        place: feature.properties.place,
        depth: feature.geometry.coordinates[2],
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        url: feature.properties.url,
      }))
      
      setUsgsData(earthquakes)
      setLastFetch(new Date())
    } catch (error) {
      console.error('USGS fetch error:', error)
      alert('Failed to fetch USGS data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUSGS()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchUSGS, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [autoRefresh, hours, minMag])

  const magColor = (m) =>
    m >= 7   ? '#b06aff' :
    m >= 5.5 ? '#ff3d3d' :
    m >= 4   ? '#ff9f1c' : '#00c8ff'

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1b2a 100%)',
        border: '1px solid rgba(0, 200, 255, 0.1)',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 48 }}></div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#00c8ff', margin: 0, fontSize: 28 }}>USGS Live Feed</h2>
            <p style={{ color: '#5a7a99', margin: '4px 0 0', fontSize: 14 }}>
              Real-time earthquake data from the United States Geological Survey
            </p>
          </div>
          {lastFetch && (
            <div style={{ textAlign: 'right', color: '#5a7a99', fontSize: 12 }}>
              Last updated:<br/>
              <span style={{ color: '#00c8ff', fontFamily: 'monospace' }}>
                {lastFetch.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 11, marginBottom: 6 }}>
              TIME PERIOD
            </label>
            <select 
              value={hours} 
              onChange={(e) => setHours(Number(e.target.value))}
              style={{
                width: '100%',
                background: '#0a1628',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#e0e0e0',
                fontSize: 13,
              }}
            >
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 2 days</option>
              <option value={168}>Last week</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 11, marginBottom: 6 }}>
              MIN MAGNITUDE
            </label>
            <select 
              value={minMag} 
              onChange={(e) => setMinMag(Number(e.target.value))}
              style={{
                width: '100%',
                background: '#0a1628',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#e0e0e0',
                fontSize: 13,
              }}
            >
              <option value={2.0}>M 2.0+</option>
              <option value={2.5}>M 2.5+</option>
              <option value={3.0}>M 3.0+</option>
              <option value={4.0}>M 4.0+</option>
              <option value={5.0}>M 5.0+</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 11, marginBottom: 6 }}>
              AUTO-REFRESH
            </label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                width: '100%',
                background: autoRefresh ? 'linear-gradient(135deg, #00e676, #00c853)' : '#0a1628',
                border: `1px solid ${autoRefresh ? '#00e676' : 'rgba(0, 200, 255, 0.2)'}`,
                borderRadius: 8,
                padding: '10px 12px',
                color: autoRefresh ? '#000' : '#e0e0e0',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {autoRefresh ? '✓ ON (1 min)' : 'OFF'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 11, marginBottom: 6 }}>
              FETCH DATA
            </label>
            <button
              onClick={fetchUSGS}
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#555' : 'linear-gradient(135deg, #00c8ff, #0099cc)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? ' Loading...' : ' Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Events', value: usgsData.length, icon: '' },
          { label: 'Strongest', value: usgsData.length ? `M${Math.max(...usgsData.map(e => e.mag)).toFixed(1)}` : '-', icon: '' },
          { label: 'Average Mag', value: usgsData.length ? `M${(usgsData.reduce((a, e) => a + e.mag, 0) / usgsData.length).toFixed(2)}` : '-', icon: '' },
          { label: 'Shallow (<70km)', value: usgsData.filter(e => e.depth <= 70).length, icon: '' },
          { label: 'Deep (>70km)', value: usgsData.filter(e => e.depth > 70).length, icon: '' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'linear-gradient(135deg, #0a1628 0%, #0d1b2a 100%)',
            border: '1px solid rgba(0, 200, 255, 0.1)',
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 11, color: '#5a7a99', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#00c8ff' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Events List */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1b2a 100%)',
        border: '1px solid rgba(0, 200, 255, 0.1)',
        borderRadius: 12,
        padding: 20,
      }}>
        <h3 style={{ color: '#00c8ff', fontSize: 18, marginBottom: 16 }}>
           Live Earthquake Feed ({usgsData.length} events)
        </h3>
        
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {usgsData.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#5a7a99' }}>
              No earthquakes found. Try adjusting the filters.
            </div>
          )}

          {usgsData.slice().reverse().map((eq, i) => (
            <div key={i} style={{
              background: 'rgba(0, 200, 255, 0.03)',
              border: '1px solid rgba(0, 200, 255, 0.1)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 200, 255, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 200, 255, 0.03)'
              e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.1)'
            }}
            onClick={() => window.open(eq.url, '_blank')}
            >
              {/* Magnitude Badge */}
              <div style={{
                minWidth: 60,
                height: 60,
                borderRadius: 12,
                background: magColor(eq.mag),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#000',
              }}>
                <div style={{ fontSize: 9, opacity: 0.7 }}>MAG</div>
                <div style={{ fontSize: 18 }}>{eq.mag.toFixed(1)}</div>
              </div>

              {/* Details */}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {eq.place}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#5a7a99' }}>
                  <span> {eq.lat.toFixed(2)}, {eq.lon.toFixed(2)}</span>
                  <span> {eq.depth.toFixed(0)} km deep</span>
                  <span> {timeAgo(eq.time)}</span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ color: '#00c8ff', fontSize: 20 }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}