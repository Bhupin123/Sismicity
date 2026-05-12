import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { earthquakeService, usgsService } from '../services/api'
import { Panel } from '../components/UI'
import { SeismoBarChart } from '../components/Charts'

// ── Map height ────────────────────────────────────────────────────
function useMapHeight() {
  const getH = () => window.innerWidth < 640 ? 320 : window.innerWidth < 900 ? 460 : 600
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
  { id: 'dark',      label: 'Dark',      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                                attr: '&copy; OpenStreetMap &copy; CARTO',    sub: 'abcd' },
  { id: 'satellite', label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                attr: '&copy; Esri',                          sub: null   },
  { id: 'terrain',   label: 'Terrain',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                             attr: '&copy; OpenTopoMap',                   sub: 'abc'  },
  { id: 'street',    label: 'Street',    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',                                     attr: '&copy; OpenStreetMap &copy; CARTO',    sub: 'abcd' },
  { id: 'night',     label: 'Night',     url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg', attr: '&copy; NASA',                    sub: null   },
]

// ── Magnitude config ──────────────────────────────────────────────
const MAG_CONFIG = [
  { min: 7,   color: '#b06aff', label: 'M7+',     cat: 'GREAT'    },
  { min: 5.5, color: '#ff3d3d', label: 'M5.5-7',  cat: 'MAJOR'    },
  { min: 4,   color: '#ff9f1c', label: 'M4-5.5',  cat: 'MODERATE' },
  { min: 0,   color: '#00c8ff', label: 'M < 4',   cat: 'MINOR'    },
]
const magColor  = m => (MAG_CONFIG.find(c => m >= c.min) || MAG_CONFIG[3]).color
const magCat    = m => (MAG_CONFIG.find(c => m >= c.min) || MAG_CONFIG[3]).cat
const magRadius = m => Math.max(5, Math.min(24, (m - 1.5) * 3.8))

function getCoords(eq) {
  if (eq.lat != null && eq.lon != null) return [+eq.lat, +eq.lon]
  return [null, null]
}

// ── Filter options ────────────────────────────────────────────────
const TIME_OPTS = [
  { label: 'All Time',  days: null },
  { label: '10 Years',  days: 3650 },
  { label: '5 Years',   days: 1825 },
  { label: '1 Year',    days: 365  },
  { label: '6 Months',  days: 180  },
  { label: '30 Days',   days: 30   },
  { label: '7 Days',    days: 7    },
  { label: '24 Hours',  days: 1    },
]
const MAG_OPTS = [
  { label: 'All',  min: null, max: null },
  { label: 'M2+',  min: 2,    max: null },
  { label: 'M3+',  min: 3,    max: null },
  { label: 'M4+',  min: 4,    max: null },
  { label: 'M5+',  min: 5,    max: null },
  { label: 'M5.5+',min: 5.5,  max: null },
  { label: 'M6+',  min: 6,    max: null },
  { label: 'M7+',  min: 7,    max: null },
]
const DEPTH_OPTS = [
  { label: 'All Depths',         min: null, max: null },
  { label: 'Shallow  < 70 km',  min: 0,    max: 70   },
  { label: 'Medium  70-300 km', min: 70,   max: 300  },
  { label: 'Deep  > 300 km',    min: 300,  max: null },
]

// ── Shared UI atoms ───────────────────────────────────────────────
const s = {
  pill: (active) => ({
    padding: '4px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    border: active ? '1px solid var(--plasma)' : '1px solid var(--border)',
    background: active ? 'rgba(0,200,255,0.15)' : 'var(--raised)',
    color: active ? 'var(--plasma)' : 'var(--txt2)',
    fontFamily: 'var(--font)',
  }),
  input: {
    padding: '6px 14px', fontSize: 13, borderRadius: 20,
    background: 'var(--raised)', border: '1px solid var(--bdr2)',
    color: 'var(--txt)', outline: 'none', fontFamily: 'var(--font)',
    transition: 'border-color 0.15s',
  },
  select: {
    padding: '6px 30px 6px 12px', fontSize: 12, borderRadius: 20,
    background: 'var(--raised)', border: '1px solid var(--bdr2)',
    color: 'var(--txt)', outline: 'none', cursor: 'pointer',
    fontFamily: 'var(--font)', appearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a7a99'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  },
  label: {
    fontSize: 10, fontWeight: 700, color: 'var(--txt3)',
    textTransform: 'uppercase', letterSpacing: 1.2,
    minWidth: 72, flexShrink: 0,
  },
  sectionDivider: {
    height: 1, background: 'var(--border)', margin: '4px 0',
  },
}

const Pill = ({ label, active, onClick }) => (
  <button style={s.pill(active)} onClick={onClick}>{label}</button>
)

const FilterRow = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    <span style={s.label}>{label}</span>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {children}
    </div>
  </div>
)

// ── Stat card ─────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'var(--plasma)' }) => (
  <div style={{
    flex: 1, minWidth: 110,
    background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '14px 16px',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
      background: `linear-gradient(90deg, ${color}, transparent)`,
    }} />
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--txt2)', textTransform: 'uppercase', marginBottom: 8 }}>
      {label}
    </div>
    <div style={{ fontFamily: 'var(--display)', fontSize: 30, color, lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4 }}>{sub}</div>}
  </div>
)

// ── World Map ─────────────────────────────────────────────────────
const WorldMap = React.memo(({ events, height, styleId }) => {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const mapInst      = useRef(null)
  const tileInst     = useRef(null)
  const markers      = useRef([])
  const readyRef     = useRef(false)
  const evRef        = useRef(events)
  useEffect(() => { evRef.current = events }, [events])

  const plotMarkers = useCallback(() => {
    const L   = window.L
    const map = mapInst.current
    if (!L || !map || !readyRef.current) return
    markers.current.forEach(m => m.remove())
    markers.current = []

    evRef.current.forEach(eq => {
      const [lat, lon] = getCoords(eq)
      if (lat == null) return
      const mag   = +(eq.mag || 0)
      const col   = magColor(mag)
      const depth = +(eq.depth || 0)
      const time  = eq.dt ? String(eq.dt).slice(0, 16).replace('T', ' ') : ''

      const m = L.circleMarker([lat, lon], {
        radius: magRadius(mag), fillColor: col, color: col,
        fillOpacity: 0.72, weight: 1.2, opacity: 1,
      }).addTo(map)

      m.bindPopup(`
        <div style="font-family:'Space Grotesk',sans-serif;min-width:200px;padding:4px 0">
          <div style="font-size:20px;font-weight:800;color:${col};margin-bottom:2px;font-family:'Bebas Neue',sans-serif;letter-spacing:1px">
            M ${mag.toFixed(1)} &nbsp;<span style="font-size:11px;font-weight:600;background:${col}22;padding:2px 8px;border-radius:10px;border:1px solid ${col}44">${magCat(mag)}</span>
          </div>
          <div style="font-size:12px;color:#8aaac8;margin-bottom:10px;line-height:1.5">${eq.place || 'Unknown location'}</div>
          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:8px;font-size:11px;color:#5a7a99;line-height:1.9;font-family:'JetBrains Mono',monospace">
            Depth &nbsp;&nbsp;&nbsp; ${depth.toFixed(1)} km<br/>
            Coords &nbsp;&nbsp; ${lat.toFixed(3)}, ${lon.toFixed(3)}<br/>
            Time &nbsp;&nbsp;&nbsp;&nbsp; ${time}
          </div>
        </div>`, { className: 'seismo-popup', maxWidth: 280 })

      markers.current.push(m)
    })
  }, [])

  useEffect(() => {
    const init = () => {
      const L = window.L
      if (!L || !mapRef.current || mapInst.current) return
      mapInst.current = L.map(mapRef.current, {
        center: [20, 0], zoom: 2, minZoom: 1, maxZoom: 18,
        zoomControl: true, scrollWheelZoom: true, worldCopyJump: true,
      })
      const style = MAP_STYLES[0]
      tileInst.current = L.tileLayer(style.url, {
        attribution: style.attr, maxZoom: 19,
        subdomains: style.sub || 'abc',
      }).addTo(mapInst.current)
      readyRef.current = true
      plotMarkers()
    }
    window.L ? init() : setTimeout(init, 200)
    return () => {
      readyRef.current = false
      mapInst.current?.remove()
      mapInst.current = null
    }
  }, [plotMarkers])

  // Swap tile layer when style changes
  useEffect(() => {
    const L   = window.L
    const map = mapInst.current
    if (!L || !map || !readyRef.current) return
    const style = MAP_STYLES.find(s => s.id === styleId) || MAP_STYLES[0]
    if (tileInst.current) map.removeLayer(tileInst.current)
    tileInst.current = L.tileLayer(style.url, {
      attribution: style.attr, maxZoom: 19,
      subdomains: style.sub || 'abc',
    }).addTo(map)
  }, [styleId])

  useEffect(() => { plotMarkers() }, [events, plotMarkers])

  useEffect(() => {
    if (mapInst.current) setTimeout(() => mapInst.current?.invalidateSize(), 80)
  }, [height])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => mapInst.current?.invalidateSize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', position: 'relative', background: '#060e18' }}>
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Map style switcher overlay */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 800,
        display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end',
      }}>
        {MAP_STYLES.map(ms => (
          <button key={ms.id}
            onClick={() => {
              const L   = window.L
              const map = mapInst.current
              if (!L || !map) return
              const style = MAP_STYLES.find(x => x.id === ms.id)
              if (tileInst.current) map.removeLayer(tileInst.current)
              tileInst.current = L.tileLayer(style.url, {
                attribution: style.attr, maxZoom: 19,
                subdomains: style.sub || 'abc',
              }).addTo(map)
            }}
            style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              borderRadius: 6, cursor: 'pointer',
              background: styleId === ms.id ? 'rgba(0,200,255,0.3)' : 'rgba(6,12,22,0.85)',
              border: styleId === ms.id ? '1px solid var(--plasma)' : '1px solid rgba(0,200,255,0.2)',
              color: styleId === ms.id ? 'var(--plasma)' : '#7a9ab8',
              backdropFilter: 'blur(6px)',
              fontFamily: 'var(--font)',
            }}>
            {ms.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 800,
        background: 'rgba(6,12,22,0.88)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,200,255,0.12)', borderRadius: 8,
        padding: '8px 14px', display: 'flex', gap: 14, flexWrap: 'wrap',
        pointerEvents: 'none',
      }}>
        {MAG_CONFIG.slice().reverse().map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#7a9ab8', fontWeight: 600, fontFamily: 'var(--font)' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}80` }} />
            {label}
          </div>
        ))}
      </div>

      {/* Event count overlay */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 800,
        background: 'rgba(6,12,22,0.88)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,200,255,0.12)', borderRadius: 8,
        padding: '6px 12px', fontSize: 11, color: 'var(--plasma)',
        fontFamily: 'var(--mono)', fontWeight: 600, pointerEvents: 'none',
      }}>
        {events.length.toLocaleString()} events
      </div>
    </div>
  )
})

// ── Main ──────────────────────────────────────────────────────────
export default function MapView() {
  const mapHeight = useMapHeight()

  // Filter state
  const [timeIdx,    setTimeIdx]    = useState(0)
  const [magIdx,     setMagIdx]     = useState(0)
  const [depthIdx,   setDepthIdx]   = useState(0)
  const [majorOnly,  setMajorOnly]  = useState(false)
  const [mapStyleId, setMapStyleId] = useState('dark')
  const [showFilters,setShowFilters]= useState(true)
  const [sortBy,     setSortBy]     = useState('time_desc')
  const [limit,      setLimit]      = useState(2733) // load all by default

  // Location filter state
  const [searchText, setSearchText] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [regionFilter,  setRegionFilter]  = useState('')
  const [cityFilter,    setCityFilter]    = useState('')

  // Data state
  const [allEvents,  setAllEvents]  = useState([])
  const [locations,  setLocations]  = useState([])
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 50

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
      if (magOpt.max)   params.max_mag   = magOpt.max
      if (majorOnly)    params.is_major  = true

      const [evtRes, locRes, statRes] = await Promise.all([
        earthquakeService.getAll(params),
        earthquakeService.getByLocation({ limit: 20 }),
        earthquakeService.getStats(timeOpt.days ? { days_back: timeOpt.days } : {}),
      ])
      setAllEvents(evtRes?.results || [])
      setLocations(locRes || [])
      setStats(statRes)
      setLastUpdate(new Date())
      setPage(1)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [timeIdx, magIdx, limit, majorOnly])

  useEffect(() => { fetchData() }, [fetchData])

  // Client-side filter + sort
  const events = useMemo(() => {
    let data = [...allEvents]

    // Depth
    if (depthOpt.min !== null) data = data.filter(e => (e.depth ?? 0) >= depthOpt.min)
    if (depthOpt.max !== null) data = data.filter(e => (e.depth ?? 0) <= depthOpt.max)

    // Text search — searches place field
    const q = searchText.trim().toLowerCase()
    if (q) data = data.filter(e => (e.place || '').toLowerCase().includes(q))

    // Country filter
    const cq = countryFilter.trim().toLowerCase()
    if (cq) data = data.filter(e => (e.place || '').toLowerCase().includes(cq))

    // Region / State / Province
    const rq = regionFilter.trim().toLowerCase()
    if (rq) data = data.filter(e => (e.place || '').toLowerCase().includes(rq))

    // City
    const cityQ = cityFilter.trim().toLowerCase()
    if (cityQ) data = data.filter(e => (e.place || '').toLowerCase().includes(cityQ))

    // Sort
    switch (sortBy) {
      case 'time_desc': data.sort((a, b) => new Date(b.dt) - new Date(a.dt)); break
      case 'time_asc':  data.sort((a, b) => new Date(a.dt) - new Date(b.dt)); break
      case 'mag_desc':  data.sort((a, b) => b.mag - a.mag); break
      case 'mag_asc':   data.sort((a, b) => a.mag - b.mag); break
      case 'depth_desc':data.sort((a, b) => b.depth - a.depth); break
    }
    return data
  }, [allEvents, depthIdx, searchText, countryFilter, regionFilter, cityFilter, sortBy])

  // Sync USGS
  const syncUSGS = async () => {
    setSyncing(true)
    try {
      const res = await usgsService.fetchLive({ days_back: 7, min_magnitude: 2.5 })
      await fetchData()
      alert(`Synced from USGS: ${res.inserted} new events added.`)
    } catch (e) {
      alert('Sync failed: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }

  const clearLocationFilters = () => {
    setSearchText(''); setCountryFilter(''); setRegionFilter(''); setCityFilter('')
  }
  const hasLocationFilter = searchText || countryFilter || regionFilter || cityFilter

  // Computed stats
  const maxMag      = events.length ? Math.max(...events.map(e => e.mag)).toFixed(1) : '—'
  const avgMag      = events.length ? (events.reduce((s, e) => s + e.mag, 0) / events.length).toFixed(2) : '—'
  const majorCount  = events.filter(e => e.mag >= 5.5).length
  const greatCount  = events.filter(e => e.mag >= 7).length
  const shallowPct  = events.length ? Math.round(events.filter(e => (e.depth||0) < 70).length / events.length * 100) : 0

  // Paginated table events
  const totalPages   = Math.ceil(events.length / PAGE_SIZE)
  const tableEvents  = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filter panel ────────────────────────────────────────── */}
      <div className="panel">
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: showFilters ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Filters</span>
            <span className="panel-badge">{events.length.toLocaleString()} events shown</span>
            {allEvents.length !== events.length && (
              <span style={{ fontSize: 11, color: 'var(--warn)' }}>
                (filtered from {allEvents.length.toLocaleString()})
              </span>
            )}
            {lastUpdate && (
              <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={syncUSGS} disabled={syncing} style={{
              ...s.pill(false), background: 'rgba(0,200,100,0.1)',
              border: '1px solid rgba(0,200,100,0.3)', color: '#00c864',
            }}>
              {syncing ? 'Syncing...' : 'Sync USGS'}
            </button>
            <button onClick={fetchData} disabled={loading} style={s.pill(false)}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={() => setShowFilters(p => !p)} style={s.pill(false)}>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Filter body */}
        {showFilters && (
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Location search */}
            <FilterRow label="Search">
              <input
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setPage(1) }}
                placeholder="Search any location, country, city..."
                style={{ ...s.input, width: 260 }}
                onFocus={e => e.target.style.borderColor = 'var(--plasma)'}
                onBlur={e  => e.target.style.borderColor = 'var(--bdr2)'}
              />
            </FilterRow>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Country</span>
                <input
                  value={countryFilter}
                  onChange={e => { setCountryFilter(e.target.value); setPage(1) }}
                  placeholder="e.g. Japan, Nepal, USA"
                  style={{ ...s.input, width: 200 }}
                  onFocus={e => e.target.style.borderColor = 'var(--plasma)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--bdr2)'}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>State / Province</span>
                <input
                  value={regionFilter}
                  onChange={e => { setRegionFilter(e.target.value); setPage(1) }}
                  placeholder="e.g. California, Bagmati"
                  style={{ ...s.input, width: 200 }}
                  onFocus={e => e.target.style.borderColor = 'var(--plasma)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--bdr2)'}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>City / Region</span>
                <input
                  value={cityFilter}
                  onChange={e => { setCityFilter(e.target.value); setPage(1) }}
                  placeholder="e.g. Kathmandu, Tokyo"
                  style={{ ...s.input, width: 200 }}
                  onFocus={e => e.target.style.borderColor = 'var(--plasma)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--bdr2)'}
                />
              </div>
              {hasLocationFilter && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <button onClick={clearLocationFilters} style={{
                    ...s.pill(false), background: 'rgba(255,61,61,0.1)',
                    border: '1px solid rgba(255,61,61,0.3)', color: 'var(--hot)',
                  }}>
                    Clear Location
                  </button>
                </div>
              )}
            </div>

            <div style={s.sectionDivider} />

            <FilterRow label="Time Period">
              {TIME_OPTS.map((o, i) => (
                <Pill key={o.label} label={o.label} active={timeIdx === i}
                  onClick={() => { setTimeIdx(i); setPage(1) }} />
              ))}
            </FilterRow>

            <FilterRow label="Magnitude">
              {MAG_OPTS.map((o, i) => (
                <Pill key={o.label} label={o.label} active={magIdx === i}
                  onClick={() => { setMagIdx(i); setPage(1) }} />
              ))}
            </FilterRow>

            <FilterRow label="Depth">
              {DEPTH_OPTS.map((o, i) => (
                <Pill key={o.label} label={o.label} active={depthIdx === i}
                  onClick={() => { setDepthIdx(i); setPage(1) }} />
              ))}
            </FilterRow>

            <div style={s.sectionDivider} />

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Sort By</span>
                <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} style={s.select}>
                  <option value="time_desc">Newest First</option>
                  <option value="time_asc">Oldest First</option>
                  <option value="mag_desc">Largest Magnitude</option>
                  <option value="mag_asc">Smallest Magnitude</option>
                  <option value="depth_desc">Deepest First</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Load Limit</span>
                <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={s.select}>
                  <option value={500}>500 events</option>
                  <option value={1000}>1,000 events</option>
                  <option value={2733}>All (2,733)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Map Style</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MAP_STYLES.map(ms => (
                    <Pill key={ms.id} label={ms.label} active={mapStyleId === ms.id}
                      onClick={() => setMapStyleId(ms.id)} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Event Type</span>
                <Pill label="Major Only (M5.5+)" active={majorOnly}
                  onClick={() => { setMajorOnly(p => !p); setPage(1) }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total Events"   value={events.length.toLocaleString()} color="var(--plasma)" sub={stats ? `of ${stats.total?.toLocaleString()} in database` : ''} />
        <StatCard label="Max Magnitude"  value={`M${maxMag}`}                   color="#ff3d3d" />
        <StatCard label="Avg Magnitude"  value={`M${avgMag}`}                   color="#ff9f1c" />
        <StatCard label="Major (M5.5+)"  value={majorCount.toLocaleString()}    color="#b06aff" sub={`${greatCount} are M7+`} />
        <StatCard label="Shallow Quakes" value={`${shallowPct}%`}               color="#00c8ff" sub="depth < 70 km" />
        {stats?.date_earliest && (
          <StatCard label="Date Range" value={stats.date_earliest} color="var(--txt2)" sub={`to ${stats.date_latest}`} />
        )}
      </div>

      {/* ── Map ──────────────────────────────────────────────────── */}
      <Panel title="Global Earthquake Map" badge={`${events.length.toLocaleString()} PLOTTED`}>
        {loading
          ? <div style={{ height: mapHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          : <WorldMap events={events} height={mapHeight} styleId={mapStyleId} />
        }
      </Panel>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <div className="grid-2">
        <Panel title="Top Locations by Frequency" badge="COUNT">
          <SeismoBarChart data={locations} dataKey="count" xKey="place"
            color="#00c8ff" height={240} horizontal />
        </Panel>
        <Panel title="Top Locations by Max Magnitude" badge="INTENSITY">
          <SeismoBarChart data={locations} dataKey="max_mag" xKey="place"
            color="#ff3d3d" height={240} horizontal />
        </Panel>
      </div>

      {/* ── Event table with pagination ───────────────────────────── */}
      <Panel
        title="Earthquake Records"
        badge={`${events.length.toLocaleString()} TOTAL`}
      >
        {loading
          ? <div className="spinner" />
          : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      {['#', 'Date / Time', 'Magnitude', 'Category', 'Depth (km)', 'Location', 'Coordinates'].map(h => (
                        <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableEvents.map((e, i) => {
                      const [lat, lon] = getCoords(e)
                      const col  = magColor(e.mag)
                      const cat  = magCat(e.mag)
                      const idx  = (page - 1) * PAGE_SIZE + i + 1
                      return (
                        <tr key={e.id || i}>
                          <td style={{ color: 'var(--txt3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                            {idx}
                          </td>
                          <td style={{ color: 'var(--txt2)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: 11 }}>
                            {new Date(e.dt).toLocaleString()}
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, fontFamily: 'var(--display)', fontSize: 16, color: col }}>
                              M{(e.mag || 0).toFixed(1)}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                              background: `${col}20`, color: col, border: `1px solid ${col}40`,
                              whiteSpace: 'nowrap',
                            }}>
                              {cat}
                            </span>
                          </td>
                          <td style={{ color: 'var(--txt2)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                            {(e.depth || 0).toFixed(1)}
                          </td>
                          <td style={{
                            maxWidth: 260, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontSize: 13,
                          }}>
                            {e.place || 'Unknown'}
                          </td>
                          <td style={{ color: 'var(--txt3)', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {lat?.toFixed(3)}, {lon?.toFixed(3)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0 0', flexWrap: 'wrap', gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--txt2)' }}>
                    Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, events.length)} of {events.length.toLocaleString()} events
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} style={s.pill(false)}>
                      First
                    </button>
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={s.pill(false)}>
                      Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                      const p = start + i
                      return p <= totalPages ? (
                        <button key={p} onClick={() => setPage(p)} style={s.pill(page === p)}>
                          {p}
                        </button>
                      ) : null
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} style={s.pill(false)}>
                      Next
                    </button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={s.pill(false)}>
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        }
      </Panel>
    </div>
  )
}