import React, { useEffect, useState } from 'react'
import { earthquakeService } from '../services/api'
import { useFilters } from '../hooks'
import { Panel, KpiCard } from '../components/UI'
import { SeismoAreaChart, SeismoBarChart, SeismoDonutChart } from '../components/Charts'
import FilterBar from '../components/FilterBar'

export default function Analytics() {
  const { params } = useFilters()
  const [stats,   setStats]   = useState(null)
  const [monthly, setMonthly] = useState([])
  const [yearly,  setYearly]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      earthquakeService.getStats(params),
      earthquakeService.getTimeline({ ...params, group_by: 'month' }),
      earthquakeService.getTimeline({ group_by: 'year' }),
    ]).then(([s, m, y]) => {
      setStats(s)
      setMonthly(m || [])
      setYearly(y  || [])
      setLoading(false)
    })
  }, [JSON.stringify(params)])

  if (loading) return <div className="spinner" />
  if (!stats)  return <div className="empty-state"><div className="empty-icon">⚠️</div><p>No data</p></div>

  const donut = [
    { label: 'Minor (<M4)',      value: stats.minor_count,    color: '#00e676' },
    { label: 'Moderate (M4–5.5)',value: stats.moderate_count, color: '#ff9f1c' },
    { label: 'Major (≥M5.5)',    value: stats.major_count,    color: '#ff3d3d' },
  ]

  const tableRows = [
    ['Total Events',    stats.total?.toLocaleString()],
    ['Avg Magnitude',   `M ${stats.avg_mag}`],
    ['Max Magnitude',   `M ${stats.max_mag}`],
    ['Min Magnitude',   `M ${stats.min_mag}`],
    ['Avg Depth',       `${stats.avg_depth} km`],
    ['Major Events',    `${stats.major_count?.toLocaleString()} (≥M5.5)`],
    ['Moderate Events', `${stats.moderate_count?.toLocaleString()} (M4–5.5)`],
    ['Minor Events',    `${stats.minor_count?.toLocaleString()} (<M4)`],
    ['Date From',       stats.date_earliest],
    ['Date To',         stats.date_latest],
  ]

  return (
    <>
      <FilterBar />

      <div className="kpi-grid">
        <KpiCard label="Total Events"    value={stats.total?.toLocaleString()}       accent="plasma" />
        <KpiCard label="Major Events"    value={stats.major_count?.toLocaleString()} accent="hot"   />
        <KpiCard label="Avg Magnitude"   value={`M ${stats.avg_mag}`} />
        <KpiCard label="Peak Magnitude"  value={`M ${stats.max_mag}`}                accent="warn"  />
        <KpiCard label="Avg Depth"       value={`${stats.avg_depth} km`} />
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <span className="panel-title"> Monthly Frequency</span>
          <span className="panel-badge">EVENTS PER MONTH</span>
        </div>
        <div className="panel-body">
          <SeismoAreaChart data={monthly} dataKey="count" height={240} />
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Panel title=" Yearly Trend" badge="ANNUAL COUNT">
          <SeismoBarChart data={yearly} dataKey="count" xKey="period"
            color="#00c8ff" height={220} />
        </Panel>
        <Panel title=" Magnitude Distribution">
          <SeismoDonutChart slices={donut} height={220} />
        </Panel>
      </div>

      <Panel title=" Full Statistics Summary" badge="AGGREGATE DATA">
        <table className="data-table">
          <tbody>
            {tableRows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ color: 'var(--txt2)', width: '40%' }}>{k}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  )
}
