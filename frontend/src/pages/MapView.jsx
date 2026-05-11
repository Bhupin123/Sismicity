import React, { useEffect, useState, useCallback, useRef } from 'react'
import { earthquakeService, usgsService } from '../services/api'
import { Panel } from '../components/UI'
import { SeismoBarChart } from '../components/Charts'

// ── Map height ────────────────────────────────────────────────────
function useMapHeight() {
  const getH = () => window.innerWidth < 640 ? 300 : window.innerWidth < 900 ? 420 : 560
  const [h, setH] = useState(getH)
  useEffect(() => {
    const fn = () => setH(getH())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return h
}

// ── Map tile layers ───────────────────────────────────────────────
const MAP_STYLES = [
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; OpenStreetMap &copy; CARTO',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri',
  },
  {
    id: 'topo',
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap',
  },
  {
    id: 'street',
    label: 'Street',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attr: '&copy; OpenStreetMap &copy; CARTO',
  },
]

// ── Magnitude color ───────────────────────────────────────────────
const MAG_COLORS = [
  { min: 7,   color: '#b06aff' },
  { min: 5.5, color: '#ff3d3d' },
  { min: 4,   color: '#ff9f1c' },
  { min: 0,   color: '#00c8ff' },
]
const magColor  = m => (MAG_COLORS.find(c => m >= c.min) || MAG_COLORS[3]).color
const magRadius = m => Math.max(4, Math.min(22, (m - 1.5) * 3.5))

function getCoords(eq) {
  if (eq.lat != null && eq.lon != null) return [eq.lat, eq.lon]
  if (eq.latitude != null && eq.longitude != null) return [eq.latitude, eq.longitude]
  return [null, null]
}

// ── Time options ──────────────────────────────────────────────────
const TIME_OPTS = [
  { label: 'All Time', days: null },
  { label: '1 Year',   days: 365  },
  { label: '6 Months', days: 180  },
  { label: '30 Days',  days: 30   },
  { label: '7 Days',   days: 7    },
  { label: '24 Hours', days: 1    },
]

const MAG_OPTS = [
  { label: 'All',  min: null },
  { label: 'M2+',  min: 2    },
  { label: 'M3+',  min: 3    },
  { label: 'M4+',  min: 4    },
  { label: 'M5+',  min: 5    },
  { label: 'M6+',  min: 6    },
  { label: 'M7+',  min: 7    },
]

const DEPTH_OPTS = [
  { label: 'All',            min: null, max: null  },
  { label: 'Shallow <70km',  min: 0,    max: 70    },
  { label: 'Medium 70-300',  min: 70,   max: 300   },
  { label: 'Deep >300km',    min: 300,  max: null  },
]

const LIMIT_OPTS = [200, 500, 1000, 2000, 5000]

// ── Small components ──────────────────────────────────────────────
const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    border: active ? '1px solid var(--plasma)' : '1px solid var(--border)',
    background: active ? 'rgba(0,200,255,0.15)' : 'var(--raised)',
    color: active ? 'var(--plasma)' : 'var(--txt2)',
  }}>{label}</button>
)

const FilterRow = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    <span style={{
      fontSize: 10, fontWeight: 700, color: 'var(--txt2)',
      textTransform: 'uppercase', letterSpacing: 1, minWidth: 70, flexShrink: 0,
    }}>{label}</span>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
  </div>
)

const KpiCard = ({ label, value, color = 'var(--plasma)' }) => (
  <div className="kpi-card" style={{ flex: 1, minWidth: 100 }}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={{ fontSize: 28, color }}>{value}</div>
  </div>
)

// ── World Map component ───────────────────────────────────────────
function WorldMap({ events, height, mapStyle, onBoundsChange }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const instanceRef  = useRef(null)
  const tileRef      = useRef(null)
  const markersRef   = useRef([])
  const readyRef     = useRef(false)
  const eventsRef    = useRef(events)

  useEffect(() => { eventsRef.current = events }, [events])

  const plotMarkers = useCallback(() => {
    const L   = window.L
    const map = instanceRef.current
    if (!L || !map || !readyRef.current) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    eventsRef.current.slice(0, 3000).forEach(eq => {
      const [lat, lon] = getCoords(eq)
      if (lat == null) return
      const mag   = eq.mag ?? 0
      const col   = magColor(mag)
      const time  = eq.dt ? String(eq.dt).slice(0, 16).replace('T', ' ') : ''
      const depth = eq.depth ?? 0

      const m = L.circleMarker([lat, lon], {
        radius: magRadius(mag), fillColor: col, color: col,
        fillOpacity: 0.7, weight: 1, opacity: 0.9,
      }).addTo(map)

      m.bindPopup(`
        <div style="font-family:inherit;min-width:190px;padding:2px 0">
          <div style="font-size:18px;font-weight:800;color:${col};margin-bottom:2px">M ${mag.toFixed(1)}</div>
          <div style="font-size:12px;color:#8aaac8;margin-bottom:8px;line-height:1.5">${eq.place || 'Unknown'}</div>
          <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;font-size:11px;color:#5a7a99;line-height:1.8">
            Depth: ${depth.toFixed(0)} km<br/>
            Lat: ${lat.toFixed(3)} | Lon: ${lon.toFixed(3)}<br/>
            ${time}
          </div>
        </div>`, { className: 'seismo-popup' })

      markersRef.current.push(m)
    })
  }, [])

  // Init map
  useEffect(() => {
    const init = () => {
      const L = window.L
      if (!L || !mapRef.current || instanceRef.current) return

      instanceRef.current = L.map(mapRef.current, {
        center: [20, 0], zoom: 2,
        zoomControl: true, scrollWheelZoom: true,
        worldCopyJump: true,
      })

      const style = MAP_STYLES[0]
      tileRef.current = L.tileLayer(style.url, {
        attribution: style.attr, maxZoom: 19, subdomains: 'abcd',
      }).addTo(instanceRef.current)

      instanceRef.current.on('moveend', () => {
        if (onBoundsChange) {
          const b = instanceRef.current.getBounds()
          onBoundsChange({
            minLat: b.getSouth(), maxLat: b.getNorth(),
            minLon: b.getWest(),  maxLon: b.getEast(),
          })
        }
      })

      readyRef.current = true
      plotMarkers()
    }

    window.L ? init() : setTimeout(init, 150)

    return () => {
      readyRef.current = false
      instanceRef.current?.remove()
      instanceRef.current = null
    }
  }, [plotMarkers, onBoundsChange])

  // Update tile layer when style changes
  useEffect(() => {
    const L   = window.L
    const map = instanceRef.current
    if (!L || !map || !readyRef.current) return
    const style = MAP_STYLES.find(s => s.id === mapStyle) || MAP_STYLES[0]
    if (tileRef.current) map.removeLayer(tileRef.current)
    tileRef.current = L.tileLayer(style.url, {
      attribution: style.attr, maxZoom: 19, subdomains: 'abcd',
    }).addTo(map)
  }, [mapStyle])

  useEffect(() => { plotMarkers() }, [events, plotMarkers])

  useEffect(() => {
    if (instanceRef.current) setTimeout(() => instanceRef.current?.invalidateSize(), 60)
  }, [height])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => instanceRef.current?.invalidateSize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{
      height, width: '100%', borderRadius: 8, overflow: 'hidden',
      position: 'relative', background: '#0a1220',
    }}>
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 800,
        background: 'rgba(6,12,22,0.88)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,200,255,0.12)', borderRadius: 8,
        padding: '7px 12px', display: 'flex', gap: 10, flexWrap: 'wrap',
        pointerEvents: 'none',
      }}>
        {[
          { color: '#b06aff', label: 'M7+' },
          { color: '#ff3d3d', label: 'M5.5-7' },
          { color: '#ff9f1c', label: 'M4-5.5' },
          { color: '#00c8ff', label: 'M<4' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#7a9ab8', fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function MapView() {
  const mapHeight = useMapHeight()

  // Filter state
  const [timeIdx,   setTimeIdx]   = useState(0)
  const [magIdx,    setMagIdx]    = useState(0)
  const [depthIdx,  setDepthIdx]  = useState(0)
  const [limit,     setLimit]     = useState(500)
  const [majorOnly, setMajorOnly] = useState(false)
  const [mapStyle,  setMapStyle]  = useState('dark')
  const [showFilters, setShowFilters] = useState(true)

  // Location search state
  const [search,    setSearch]    = useState('')
  const [country,   setCountry]   = useState('')
  const [region,    setRegion]    = useState('')

  // Data state
  const [allEvents,  setAllEvents]  = useState([])
  const [events,     setEvents]     = useState([])
  const [locations,  setLocations]  = useState([])
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [fetching,   setFetching]   = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [sortBy,     setSortBy]     = useState('time_desc')

  const timeOpt  = TIME_OPTS[timeIdx]
  const magOpt   = MAG_OPTS[magIdx]
  const depthOpt = DEPTH_OPTS[depthIdx]

  // Fetch from backend
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit }
      if (timeOpt.days) params.days_back = timeOpt.days
      if (magOpt.min)   params.min_mag   = magOpt.min
      if (majorOnly)    params.is_major  = true

      const [evtRes, locRes, statRes] = await Promise.all([
        earthquakeService.getAll(params),
        earthquakeService.getByLocation({ limit: 15 }),
        earthquakeService.getStats(timeOpt.days ? { days_back: timeOpt.days } : {}),
      ])

      setAllEvents(evtRes?.results || [])
      setLocations(locRes || [])
      setStats(statRes)
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [timeIdx, magIdx, limit, majorOnly])

  useEffect(() => { fetchData() }, [fetchData])

  // Client-side filtering (depth, search, country, region, sort)
  useEffect(() => {
    let data = [...allEvents]

    if (depthOpt.min !== null) data = data.filter(e => (e.depth ?? 0) >= depthOpt.min)
    if (depthOpt.max !== null) data = data.filter(e => (e.depth ?? 0) <= depthOpt.max)

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(e => (e.place || '').toLowerCase().includes(q))
    }
    if (country.trim()) {
      const q = country.toLowerCase()
      data = data.filter(e => (e.place || '').toLowerCase().includes(q))
    }
    if (region.trim()) {
      const q = region.toLowerCase()
      data = data.filter(e => (e.place || '').toLowerCase().includes(q))
    }

    switch (sortBy) {
      case 'time_desc': data.sort((a, b) => new Date(b.dt) - new Date(a.dt)); break
      case 'time_asc':  data.sort((a, b) => new Date(a.dt) - new Date(b.dt)); break
      case 'mag_desc':  data.sort((a, b) => b.mag - a.mag); break
      case 'mag_asc':   data.sort((a, b) => a.mag - b.mag); break
    }

    setEvents(data)
  }, [allEvents, depthIdx, search, country, region, sortBy])

  // Sync USGS
  const syncUSGS = async () => {
    setFetching(true)
    try {
      const res = await usgsService.fetchLive({ days_back: 7, min_magnitude: 2.5 })
      await fetchData()
      alert(`Synced: ${res.inserted} new events added from USGS.`)
    } catch (e) {
      alert('Sync failed: ' + e.message)
    } finally {
      setFetching(false)
    }
  }

  // Computed stats
  const maxMag     = events.length ? Math.max(...events.map(e => e.mag)).toFixed(1) : '-'
  const avgMag     = events.length ? (events.reduce((s, e) => s + e.mag, 0) / events.length).toFixed(1) : '-'
  const majorCount = events.filter(e => e.mag >= 5.5).length
  const minorCount = events.filter(e => e.mag < 4).length

  const magBadgeStyle = (mag) => {
    if (mag >= 7)   return { background: 'rgba(176,106,255,0.15)', color: '#b06aff' }
    if (mag >= 5.5) return { background: 'rgba(255,61,61,0.15)',   color: '#ff3d3d' }
    if (mag >= 4)   return { background: 'rgba(255,159,28,0.15)',  color: '#ff9f1c' }
    return               { background: 'rgba(0,200,255,0.1)',     color: '#00c8ff' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filter panel ── */}
      <div className="panel">
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: showFilters ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
              Filters
            </span>
            <span className="panel-badge">{events.length.toLocaleString()} events</span>
            {lastUpdate && (
              <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={syncUSGS} disabled={fetching} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6,
              cursor: fetching ? 'not-allowed' : 'pointer',
              background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)',
              color: '#00c864',
            }}>
              {fetching ? 'Syncing...' : 'Sync USGS'}
            </button>
            <button onClick={fetchData} disabled={loading} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'rgba(0,200,255,0.1)', border: '1px solid var(--bdr2)',
              color: 'var(--plasma)',
            }}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={() => setShowFilters(p => !p)} style={{
              padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
              cursor: 'pointer', background: 'var(--raised)',
              border: '1px solid var(--border)', color: 'var(--txt2)',
            }}>
              {showFilters ? 'Hide' : 'Filters'}
            </button>
          </div>
        </div>

        {/* Filter rows */}
        {showFilters && (
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Location search */}
            <FilterRow label="Location">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search city, country, region..."
                style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 20,
                  background: 'var(--raised)', border: '1px solid var(--bdr2)',
                  color: 'var(--txt)', outline: 'none', width: 260,
                }}
              />
              <input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Country (e.g. Japan)"
                style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 20,
                  background: 'var(--raised)', border: '1px solid var(--bdr2)',
                  color: 'var(--txt)', outline: 'none', width: 180,
                }}
              />
              <input
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="State / Province / City"
                style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 20,
                  background: 'var(--raised)', border: '1px solid var(--bdr2)',
                  color: 'var(--txt)', outline: 'none', width: 200,
                }}
              />
              {(search || country || region) && (
                <button
                  onClick={() => { setSearch(''); setCountry(''); setRegion('') }}
                  style={{
                    padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 20,
                    cursor: 'pointer', background: 'rgba(255,61,61,0.1)',
                    border: '1px solid rgba(255,61,61,0.3)', color: '#ff3d3d',
                  }}>
                  Clear
                </button>
              )}
            </FilterRow>

            <div style={{ height: 1, background: 'var(--border)' }} />

            <FilterRow label="Time">
              {TIME_OPTS.map((o, i) => (
                <Pill key={o.label} label={o.label} active={timeIdx === i} onClick={() => setTimeIdx(i)} />
              ))}
            </FilterRow>

            <FilterRow label="Magnitude">
              {MAG_OPTS.map((o, i) => (
                <Pill key={o.label} label={o.label} active={magIdx === i} onClick={() => setMagIdx(i)} />
              ))}
            </FilterRow>

            <FilterRow label="Depth">
              {DEPTH_OPTS.map((o, i) => (
                <Pill key={o.label} label={o.label} active={depthIdx === i} onClick={() => setDepthIdx(i)} />
              ))}
            </FilterRow>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <FilterRow label="Sort">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="form-select"
                  style={{ width: 160, padding: '5px 30px 5px 10px', fontSize: 12, borderRadius: 20 }}>
                  <option value="time_desc">Newest First</option>
                  <option value="time_asc">Oldest First</option>
                  <option value="mag_desc">Largest First</option>
                  <option value="mag_asc">Smallest First</option>
                </select>
              </FilterRow>

              <FilterRow label="Limit">
                <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="form-select"
                  style={{ width: 150, padding: '5px 30px 5px 10px', fontSize: 12, borderRadius: 20 }}>
                  {LIMIT_OPTS.map(l => <option key={l} value={l}>{l.toLocaleString()} events</option>)}
                </select>
              </FilterRow>

              <FilterRow label="Map Style">
                {MAP_STYLES.map(s => (
                  <Pill key={s.id} label={s.label} active={mapStyle === s.id} onClick={() => setMapStyle(s.id)} />
                ))}
              </FilterRow>

              <FilterRow label="Type">
                <Pill label="Major Only (M5.5+)" active={majorOnly} onClick={() => setMajorOnly(p => !p)} />
              </FilterRow>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard label="Displayed"  value={events.length.toLocaleString()} color="var(--plasma)" />
        <KpiCard label="Max Mag"    value={`M${maxMag}`}                   color="#ff3d3d" />
        <KpiCard label="Avg Mag"    value={`M${avgMag}`}                   color="#ff9f1c" />
        <KpiCard label="Major (M5.5+)" value={majorCount.toLocaleString()} color="#b06aff" />
        <KpiCard label="Minor (<M4)"   value={minorCount.toLocaleString()} color="#00c8ff" />
        {stats && <KpiCard label="Total in DB" value={(stats.total || 0).toLocaleString()} color="var(--txt2)" />}
      </div>

      {/* ── World Map ── */}
      <Panel title="Global Earthquake Map" badge={`${events.length.toLocaleString()} EVENTS`}>
        {loading
          ? <div style={{ height: mapHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          : <WorldMap events={events} height={mapHeight} mapStyle={mapStyle} />
        }
      </Panel>

      {/* ── Charts ── */}
      <div className="grid-2">
        <Panel title="Top Locations by Frequency" badge="COUNT">
          <SeismoBarChart data={locations} dataKey="count" xKey="place"
            color="#00c8ff" height={220} horizontal />
        </Panel>
        <Panel title="Top Locations by Max Magnitude" badge="INTENSITY">
          <SeismoBarChart data={locations} dataKey="max_mag" xKey="place"
            color="#ff3d3d" height={220} horizontal />
        </Panel>
      </div>

      {/* ── Event table ── */}
      <Panel title="Event List" badge={`SHOWING ${Math.min(events.length, 100)} OF ${events.length}`}>
        {loading
          ? <div className="spinner" />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Date / Time', 'Magnitude', 'Depth (km)', 'Location', 'Coordinates', 'Category'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 100).map((e, i) => {
                    const [lat, lon] = getCoords(e)
                    const badge = magBadgeStyle(e.mag)
                    return (
                      <tr key={e.id || i}>
                        <td style={{ color: 'var(--txt2)', whiteSpace: 'nowrap' }}>
                          {new Date(e.dt).toLocaleString()}
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 800, fontFamily: 'var(--display)',
                            fontSize: 15, color: magColor(e.mag),
                          }}>
                            M{(e.mag || 0).toFixed(1)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--txt2)' }}>
                          {(e.depth || 0).toFixed(1)}
                        </td>
                        <td style={{
                          maxWidth: 220, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {e.place || 'Unknown'}
                        </td>
                        <td style={{ color: 'var(--txt3)', fontSize: 11, fontFamily: 'var(--mono)' }}>
                          {lat?.toFixed(2)}, {lon?.toFixed(2)}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 10,
                            fontWeight: 700, ...badge,
                            border: `1px solid ${badge.color}44`,
                          }}>
                            {e.mag >= 7 ? 'GREAT' : e.mag >= 5.5 ? 'MAJOR' : e.mag >= 4 ? 'MODERATE' : 'MINOR'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Panel>
    </div>
  )
}