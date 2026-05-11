import React, { useEffect, useState, useCallback } from 'react'
import { earthquakeService, usgsService } from '../services/api'
import EarthquakeMap from '../components/EarthquakeMap'
import { Panel } from '../components/UI'
import { SeismoBarChart } from '../components/Charts'

// ── Map height hook ───────────────────────────────────────────────
function useMapHeight() {
  const getH = () => {
    const w = window.innerWidth
    if (w < 480) return 240
    if (w < 640) return 300
    if (w < 900) return 380
    return 520
  }
  const [h, setH] = useState(getH)
  useEffect(() => {
    const fn = () => setH(getH())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return h
}

// ── Filter config ─────────────────────────────────────────────────
const TIME_OPTIONS = [
  { label: 'All Time', days: null },
  { label: '1 Year',   days: 365  },
  { label: '6 Months', days: 180  },
  { label: '1 Month',  days: 30   },
  { label: '7 Days',   days: 7    },
  { label: '24 Hours', days: 1    },
]

const MAG_OPTIONS = [
  { label: 'All',  min: null, max: null },
  { label: 'M2+',  min: 2,    max: null },
  { label: 'M3+',  min: 3,    max: null },
  { label: 'M4+',  min: 4,    max: null },
  { label: 'M5+',  min: 5,    max: null },
  { label: 'M6+',  min: 6,    max: null },
  { label: 'M7+',  min: 7,    max: null },
]

const DEPTH_OPTIONS = [
  { label: 'All Depths', min: null, max: null  },
  { label: 'Shallow (<70km)',  min: 0,   max: 70  },
  { label: 'Intermediate (70-300km)', min: 70,  max: 300 },
  { label: 'Deep (>300km)',    min: 300, max: null },
]

const SORT_OPTIONS = [
  { label: 'Newest First',   value: 'time_desc'  },
  { label: 'Oldest First',   value: 'time_asc'   },
  { label: 'Largest First',  value: 'mag_desc'   },
  { label: 'Smallest First', value: 'mag_asc'    },
]

const LIMIT_OPTIONS = [100, 500, 1000, 2000, 5000]

// ── Filter pill button ────────────────────────────────────────────
function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', fontSize: 12, fontWeight: 600,
      borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
      background: active ? 'rgba(0,200,255,0.15)' : 'var(--raised)',
      color: active ? 'var(--accent)' : 'var(--txt2)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, color = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'var(--raised)', borderRadius: 10, padding: '12px 16px',
      border: '1px solid var(--border)', textAlign: 'center', flex: 1,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--display)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Filter row ────────────────────────────────────────────────────
function FilterSection({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--txt3)',
        textTransform: 'uppercase', letterSpacing: 1, minWidth: 60,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function MapView() {
  const mapHeight = useMapHeight()

  // Filter state
  const [timeIdx,  setTimeIdx]  = useState(0)
  const [magIdx,   setMagIdx]   = useState(0)
  const [depthIdx, setDepthIdx] = useState(0)
  const [sortVal,  setSortVal]  = useState('time_desc')
  const [limit,    setLimit]    = useState(500)
  const [majorOnly, setMajorOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  // Data state
  const [events,    setEvents]    = useState([])
  const [locations, setLocations] = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [fetching,  setFetching]  = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const timeOpt  = TIME_OPTIONS[timeIdx]
  const magOpt   = MAG_OPTIONS[magIdx]
  const depthOpt = DEPTH_OPTIONS[depthIdx]

  // Build API params from filters
  const buildParams = useCallback(() => {
    const p = { limit }
    if (timeOpt.days)    p.days_back = timeOpt.days
    if (magOpt.min)      p.min_mag   = magOpt.min
    if (magOpt.max)      p.max_mag   = magOpt.max
    if (majorOnly)       p.is_major  = true
    return p
  }, [timeIdx, magIdx, limit, majorOnly])

  // Sort events client-side (depth filter also client-side)
  const processEvents = useCallback((raw) => {
    let data = [...raw]

    // Depth filter
    if (depthOpt.min !== null) data = data.filter(e => e.depth >= depthOpt.min)
    if (depthOpt.max !== null) data = data.filter(e => e.depth <= depthOpt.max)

    // Sort
    switch (sortVal) {
      case 'time_desc': data.sort((a, b) => new Date(b.dt) - new Date(a.dt)); break
      case 'time_asc':  data.sort((a, b) => new Date(a.dt) - new Date(b.dt)); break
      case 'mag_desc':  data.sort((a, b) => b.mag - a.mag); break
      case 'mag_asc':   data.sort((a, b) => a.mag - b.mag); break
    }
    return data
  }, [depthIdx, sortVal])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams()
      const [evtRes, locRes, statRes] = await Promise.all([
        earthquakeService.getAll(params),
        earthquakeService.getByLocation({ limit: 15 }),
        earthquakeService.getStats(timeOpt.days ? { days_back: timeOpt.days } : {}),
      ])
      setEvents(processEvents(evtRes?.results || []))
      setLocations(locRes || [])
      setStats(statRes)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('MapView fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [buildParams, processEvents])

  useEffect(() => { fetchData() }, [fetchData])

  // Re-sort without refetching when only sort/depth changes
  useEffect(() => {
    if (events.length > 0) {
      setEvents(prev => processEvents(prev))
    }
  }, [sortVal, depthIdx])

  // Fetch live USGS data
  const fetchUSGS = async () => {
    setFetching(true)
    try {
      const res = await usgsService.fetchLive({ days_back: 7, min_magnitude: 2.5 })
      await fetchData()
      alert(`Synced from USGS: ${res.inserted} new events added.`)
    } catch (e) {
      alert('USGS sync failed: ' + e.message)
    } finally {
      setFetching(false)
    }
  }

  // Computed stats from current events
  const displayed   = events.length
  const maxMag      = events.length ? Math.max(...events.map(e => e.mag)).toFixed(1) : '-'
  const avgMag      = events.length ? (events.reduce((s, e) => s + e.mag, 0) / events.length).toFixed(1) : '-'
  const majorCount  = events.filter(e => e.mag >= 5.5).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filter panel ── */}
      <div style={{
        background: 'var(--panel)', borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Filter header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: showFilters ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
              Filters
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: 'rgba(0,200,255,0.1)', color: 'var(--accent)',
              border: '1px solid rgba(0,200,255,0.2)', fontWeight: 600,
            }}>
              {displayed.toLocaleString()} events
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button onClick={fetchUSGS} disabled={fetching} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 700,
              borderRadius: 6, cursor: fetching ? 'not-allowed' : 'pointer',
              background: 'rgba(0,200,100,0.1)',
              border: '1px solid rgba(0,200,100,0.3)',
              color: '#00c864', transition: 'all 0.15s',
            }}>
              {fetching ? 'Syncing...' : 'Sync USGS'}
            </button>
            <button onClick={fetchData} disabled={loading} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 700,
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              background: 'rgba(0,200,255,0.1)',
              border: '1px solid rgba(0,200,255,0.2)',
              color: 'var(--accent)', transition: 'all 0.15s',
            }}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={() => setShowFilters(p => !p)} style={{
              padding: '5px 10px', fontSize: 11, fontWeight: 600,
              borderRadius: 6, cursor: 'pointer',
              background: 'var(--raised)', border: '1px solid var(--border)',
              color: 'var(--txt2)',
            }}>
              {showFilters ? 'Hide' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Filter rows */}
        {showFilters && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FilterSection label="Time">
              {TIME_OPTIONS.map((o, i) => (
                <Pill key={o.label} label={o.label}
                  active={timeIdx === i} onClick={() => setTimeIdx(i)} />
              ))}
            </FilterSection>

            <FilterSection label="Magnitude">
              {MAG_OPTIONS.map((o, i) => (
                <Pill key={o.label} label={o.label}
                  active={magIdx === i} onClick={() => setMagIdx(i)} />
              ))}
            </FilterSection>

            <FilterSection label="Depth">
              {DEPTH_OPTIONS.map((o, i) => (
                <Pill key={o.label} label={o.label}
                  active={depthIdx === i} onClick={() => setDepthIdx(i)} />
              ))}
            </FilterSection>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <FilterSection label="Sort">
                <select value={sortVal} onChange={e => setSortVal(e.target.value)} style={{
                  padding: '5px 10px', fontSize: 12, borderRadius: 6,
                  background: 'var(--raised)', border: '1px solid var(--border)',
                  color: 'var(--txt)', cursor: 'pointer', outline: 'none',
                }}>
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection label="Limit">
                <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{
                  padding: '5px 10px', fontSize: 12, borderRadius: 6,
                  background: 'var(--raised)', border: '1px solid var(--border)',
                  color: 'var(--txt)', cursor: 'pointer', outline: 'none',
                }}>
                  {LIMIT_OPTIONS.map(l => (
                    <option key={l} value={l}>{l.toLocaleString()} events</option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection label="Type">
                <Pill label="Major Only (M5.5+)"
                  active={majorOnly} onClick={() => setMajorOnly(p => !p)} />
              </FilterSection>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Displayed Events" value={displayed.toLocaleString()} color="var(--accent)" />
        <StatCard label="Max Magnitude"    value={`M${maxMag}`}              color="#ff4444" />
        <StatCard label="Avg Magnitude"    value={`M${avgMag}`}              color="#ffaa00" />
        <StatCard label="Major Events"     value={majorCount.toLocaleString()} color="#ff6600" />
        {stats && (
          <StatCard label="Total in DB" value={stats.total?.toLocaleString() || '-'} color="var(--txt2)" />
        )}
      </div>

      {/* ── Map ── */}
      <Panel
        title="Earthquake Epicenters"
        badge={`${displayed.toLocaleString()} EVENTS`}
      >
        {loading
          ? <div style={{ height: mapHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          : <EarthquakeMap events={events} height={mapHeight} />
        }
      </Panel>

      {/* ── Charts ── */}
      <div className="grid-2">
        <Panel title="Top Locations by Frequency" badge="COUNT">
          <SeismoBarChart
            data={locations}
            dataKey="count"
            xKey="place"
            color="#00c8ff"
            height={220}
            horizontal
          />
        </Panel>
        <Panel title="Top Locations by Max Magnitude" badge="INTENSITY">
          <SeismoBarChart
            data={locations}
            dataKey="max_mag"
            xKey="place"
            color="#ff3d3d"
            height={220}
            horizontal
          />
        </Panel>
      </div>

      {/* ── Event table ── */}
      <Panel title="Recent Events" badge={`${Math.min(displayed, 50)} OF ${displayed}`}>
        {loading ? <div className="spinner" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date / Time', 'Magnitude', 'Depth', 'Location', 'Type'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      color: 'var(--txt2)', fontWeight: 600,
                      fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((e, i) => {
                  const color = e.mag >= 5.5 ? '#ff4444' : e.mag >= 4 ? '#ffaa00' : '#00c864'
                  return (
                    <tr key={e.id || i} style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={ev => ev.currentTarget.style.background = 'var(--raised)'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--txt2)' }}>
                        {new Date(e.dt).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          fontWeight: 800, color, fontFamily: 'var(--display)',
                          fontSize: 14,
                        }}>
                          M{e.mag?.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--txt2)' }}>
                        {e.depth?.toFixed(1)} km
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--txt)', maxWidth: 200,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.place}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 10,
                          fontWeight: 700, background: `${color}22`, color,
                          border: `1px solid ${color}44`,
                        }}>
                          {e.mag >= 5.5 ? 'MAJOR' : e.mag >= 4 ? 'MODERATE' : 'MINOR'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}