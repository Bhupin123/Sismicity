import React, { useEffect, useState } from 'react'
import { earthquakeService } from '../services/api'
import { useFilters } from '../hooks'
import { KpiCard, MagBadge, Panel } from '../components/UI'
import { SeismoAreaChart, SeismoDonutChart, SeismoBarChart } from '../components/Charts'
import FilterBar from '../components/FilterBar'

export default function Overview() {
  const { params } = useFilters()
  const [stats,     setStats]     = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [locations, setLocations] = useState([])
  const [recent,    setRecent]    = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      earthquakeService.getStats(params),
      earthquakeService.getTimeline(params),
      earthquakeService.getByLocation({ limit: 12 }),
      earthquakeService.getRecent({ hours: 48, limit: 15 }),
    ]).then(([s, t, l, r]) => {
      setStats(s)
      setTimeline(t || [])
      setLocations(l || [])
      setRecent(r || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [JSON.stringify(params)])

  if (loading) return <div className="spinner" />
  if (!stats)  return <div className="empty-state"><div className="empty-icon">⚠️</div><p>Cannot reach Django API. Is the server running?</p></div>

  const donutData = [
    { label: 'Minor  (<M4)',   value: stats.minor_count,    color: '#00e676' },
    { label: 'Moderate (M4–5.5)', value: stats.moderate_count, color: '#ff9f1c' },
    { label: 'Major  (≥M5.5)', value: stats.major_count,    color: '#ff3d3d' },
  ]
  const majorPct = stats.total ? ((stats.major_count / stats.total) * 100).toFixed(1) : 0

  return (
    <>
      <FilterBar />

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard label="Total Events"   value={stats.total?.toLocaleString()}    accent="plasma"
          sub={`${stats.date_earliest} → ${stats.date_latest}`} />
        <KpiCard label="Major Alerts"   value={stats.major_count?.toLocaleString()} accent="hot"
          sub={`${majorPct}% of total`} />
        <KpiCard label="Avg Magnitude"  value={`M ${stats.avg_mag}`}
          sub={`Range: M${stats.min_mag} – M${stats.max_mag}`} />
        <KpiCard label="Peak Event"     value={`M ${stats.max_mag}`}      accent="warn"
          sub="Largest recorded" />
        <KpiCard label="Avg Depth"      value={`${stats.avg_depth} km`}
          sub="Below surface" />
      </div>

      {/* Timeline + Donut */}
      <div className="grid-6-4">
        <Panel title=" Activity Timeline" badge="SEISMIC FREQUENCY">
          <SeismoAreaChart data={timeline} dataKey="count" height={220} />
        </Panel>
        <Panel title=" Event Distribution">
          <SeismoDonutChart slices={donutData} height={220} />
        </Panel>
      </div>

      {/* Locations + Recent */}
      <div className="grid-4-6">
        <Panel title=" Top Active Locations" badge="BY COUNT">
          <SeismoBarChart data={locations} dataKey="count" xKey="place"
            color="#00c8ff" height={240} horizontal />
        </Panel>

        <Panel title=" Recent Events" badge="LAST 48H">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th>Mag</th>
                  <th>Depth</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--txt2)' }}>
                      {String(e.dt).slice(0, 16)}
                    </td>
                    <td><MagBadge mag={e.mag} /></td>
                    <td style={{ color: 'var(--txt2)', fontSize: 12 }}>
                      {Number(e.depth).toFixed(0)} km
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.place}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
