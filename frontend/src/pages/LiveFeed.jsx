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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUSGS() }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchUSGS, 60000)
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

  const selectStyle = {
    width: '100%',
    background: '#0a1628',
    border: '1px solid rgba(0,200,255,0.2)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e0e0e0',
    fontSize: 13,
  }

  return (
    <div style={{ padding: '16px 4px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#0a1628,#0d1b2a)',
        border: '1px solid rgba(0,200,255,0.1)',
        borderRadius: 16, padding: '20px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 36 }}></div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 style={{ color: '#00c8ff', margin: 0, fontSize: 22 }}>USGS Live Feed</h2>
            <p style={{ color: '#5a7a99', margin: '4px 0 0', fontSize: 13 }}>
              Real-time earthquake data from the USGS
            </p>
          </div>
          {lastFetch && (
            <div style={{ color: '#5a7a99', fontSize: 11, textAlign: 'right' }}>
              Updated:<br/>
              <span style={{ color: '#00c8ff', fontFamily: 'monospace' }}>
                {lastFetch.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Controls — responsive grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 10, marginBottom: 5 }}>TIME PERIOD</label>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} style={selectStyle}>
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 2 days</option>
              <option value={168}>Last week</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 10, marginBottom: 5 }}>MIN MAGNITUDE</label>
            <select value={minMag} onChange={(e) => setMinMag(Number(e.target.value))} style={selectStyle}>
              <option value={2.0}>M 2.0+</option>
              <option value={2.5}>M 2.5+</option>
              <option value={3.0}>M 3.0+</option>
              <option value={4.0}>M 4.0+</option>
              <option value={5.0}>M 5.0+</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 10, marginBottom: 5 }}>AUTO-REFRESH</label>
            <button onClick={() => setAutoRefresh(!autoRefresh)} style={{
              width: '100%',
              background: autoRefresh ? 'linear-gradient(135deg,#00e676,#00c853)' : '#0a1628',
              border: `1px solid ${autoRefresh ? '#00e676' : 'rgba(0,200,255,0.2)'}`,
              borderRadius: 8, padding: '10px 12px',
              color: autoRefresh ? '#000' : '#e0e0e0',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {autoRefresh ? '✓ ON (1 min)' : 'OFF'}
            </button>
          </div>
          <div>
            <label style={{ display: 'block', color: '#5a7a99', fontSize: 10, marginBottom: 5 }}>FETCH DATA</label>
            <button onClick={fetchUSGS} disabled={loading} style={{
              width: '100%',
              background: loading ? '#555' : 'linear-gradient(135deg,#00c8ff,#0099cc)',
              border: 'none', borderRadius: 8, padding: '10px 12px',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats — responsive grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Events',    value: usgsData.length },
          { label: 'Strongest',       value: usgsData.length ? `M${Math.max(...usgsData.map(e => e.mag)).toFixed(1)}` : '-' },
          { label: 'Average Mag',     value: usgsData.length ? `M${(usgsData.reduce((a,e) => a + e.mag, 0) / usgsData.length).toFixed(2)}` : '-' },
          { label: 'Shallow (<70km)', value: usgsData.filter(e => e.depth <= 70).length },
          { label: 'Deep (>70km)',    value: usgsData.filter(e => e.depth > 70).length },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'linear-gradient(135deg,#0a1628,#0d1b2a)',
            border: '1px solid rgba(0,200,255,0.1)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: '#5a7a99', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#00c8ff' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Events List */}
      <div style={{
        background: 'linear-gradient(135deg,#0a1628,#0d1b2a)',
        border: '1px solid rgba(0,200,255,0.1)',
        borderRadius: 12, padding: '16px',
      }}>
        <h3 style={{ color: '#00c8ff', fontSize: 16, marginBottom: 14, marginTop: 0 }}>
           Live Feed ({usgsData.length} events)
        </h3>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {usgsData.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#5a7a99' }}>
              No earthquakes found. Try adjusting filters.
            </div>
          )}
          {usgsData.slice().reverse().map((eq, i) => (
            <div key={i}
              onClick={() => window.open(eq.url, '_blank')}
              style={{
                background: 'rgba(0,200,255,0.03)',
                border: '1px solid rgba(0,200,255,0.1)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,200,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,200,255,0.03)'
                e.currentTarget.style.borderColor = 'rgba(0,200,255,0.1)'
              }}
            >
              <div style={{
                minWidth: 52, height: 52, borderRadius: 10,
                background: magColor(eq.mag),
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#000', flexShrink: 0,
              }}>
                <div style={{ fontSize: 8 }}>MAG</div>
                <div style={{ fontSize: 16 }}>{eq.mag.toFixed(1)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 600, marginBottom: 4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {eq.place}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#5a7a99', flexWrap: 'wrap' }}>
                  <span>{eq.depth.toFixed(0)} km deep</span>
                  <span>{timeAgo(eq.time)}</span>
                </div>
              </div>
              <div style={{ color: '#00c8ff', fontSize: 16, flexShrink: 0 }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}