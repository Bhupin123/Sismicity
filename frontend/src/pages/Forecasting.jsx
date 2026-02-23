import React, { useState } from 'react'
import { forecastService } from '../services/api'
import { Panel, Btn } from '../components/UI'
import { SeismoBarChart } from '../components/Charts'

export default function Forecasting() {
  const [tab, setTab] = useState('forecast')

  // Forecast state
  const [days,      setDays]      = useState(7)
  const [forecasts, setForecasts] = useState(null)
  const [fLoading,  setFLoading]  = useState(false)

  // Hotspot state
  const [hotspots,  setHotspots]  = useState(null)
  const [hLoading,  setHLoading]  = useState(false)

  // Proximity state
  const [proxForm, setProxForm] = useState({ lat: 28.0, lon: 84.0, radius_km: 100, hours_back: 24 })
  const [alerts,   setAlerts]   = useState(null)
  const [aLoading, setALoading] = useState(false)

  const runForecast = async () => {
    setFLoading(true)
    const r = await forecastService.getForecast({ days_ahead: days }).catch(() => null)
    setForecasts(r?.forecasts || [])
    setFLoading(false)
  }

  const runHotspots = async () => {
    setHLoading(true)
    const r = await forecastService.getHotspots({ eps_km: 50, min_samples: 5 }).catch(() => null)
    setHotspots(r?.hotspots || [])
    setHLoading(false)
  }

  const runProximity = async () => {
    setALoading(true)
    const r = await forecastService.getProximity(proxForm).catch(() => null)
    setAlerts(r?.alerts || [])
    setALoading(false)
  }

  const catColor = (c) => c === 'Minor' ? 'var(--ok)' : c === 'Moderate' ? 'var(--warn)' : 'var(--hot)'
  const riskColor= (r) => r >= 70 ? 'var(--hot)' : r >= 50 ? 'var(--warn)' : '#ff9f1c'
  const magColor = (m) => m >= 6 ? 'var(--hot)' : m >= 5 ? 'var(--warn)' : 'var(--ok)'

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[['forecast',' Probability Forecast'],['hotspots',' Risk Hotspots'],['alerts',' Location Alerts']].map(([k,l]) => (
          <button key={k} className={`filter-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── FORECAST ── */}
      {tab === 'forecast' && (
        <div className="grid-4-6">
          <Panel title=" Forecast Settings">
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label">Forecast Window</label>
              <select className="form-select" value={days} onChange={(e) => setDays(+e.target.value)}>
                {[3,7,14,30].map((d) => <option key={d} value={d}>Next {d} days</option>)}
              </select>
            </div>
            <Btn full onClick={runForecast} disabled={fLoading}>
              {fLoading ? ' Calculating…' : ' Generate Forecast'}
            </Btn>
            {forecasts && (
              <div style={{ marginTop: 14, padding: 12, background: 'var(--raised)', borderRadius: 8,
                fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7 }}>
                📌 <strong style={{ color: 'var(--txt)' }}>Method:</strong> Poisson process modeling using
                historical earthquake frequency data. Probabilities are statistical estimates.
              </div>
            )}
          </Panel>

          <Panel title={` Forecast — Next ${days} Days`} badge="POISSON MODEL">
            {fLoading && <div className="spinner" />}
            {!forecasts && !fLoading && (
              <div className="empty-state">
                <div className="empty-icon"></div>
                <p>Click Generate Forecast to run the model</p>
              </div>
            )}
            {forecasts && forecasts.map((f, i) => (
              <div key={i} style={{
                background: 'var(--card)', borderRadius: 10, padding: 18,
                borderLeft: `3px solid ${catColor(f.category)}`, marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: catColor(f.category),
                      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                      {f.category} Earthquakes
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 44, lineHeight: 1, color: catColor(f.category) }}>
                      {Number(f.probability || 0).toFixed(0)}<span style={{ fontSize: 20 }}>%</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--txt)' }}>
                      ~{Number(f.expected_count || 0).toFixed(1)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt2)' }}>expected events</div>
                    {f.rate_per_day && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4 }}>
                      {Number(f.rate_per_day).toFixed(2)}/day avg
                    </div>}
                  </div>
                </div>
                <div style={{ height: 5, background: 'var(--raised)', borderRadius: 3, marginTop: 12 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: catColor(f.category),
                    width: `${Math.min(f.probability || 0, 100)}%`,
                    transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {/* ── HOTSPOTS ── */}
      {tab === 'hotspots' && (
        <div className="grid-4-6">
          <Panel title=" Cluster Settings">
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.6 }}>
              Uses DBSCAN clustering to identify geographic zones with concentrated seismic activity.
            </p>
            <Btn full onClick={runHotspots} disabled={hLoading}>
              {hLoading ? ' Analyzing…' : ' Detect Hotspots'}
            </Btn>
          </Panel>

          <Panel title=" Active Seismic Zones" badge={hotspots ? `${hotspots.length} ZONES` : 'DBSCAN'}>
            {hLoading && <div className="spinner" />}
            {!hotspots && !hLoading && (
              <div className="empty-state"><div className="empty-icon"></div><p>Click Detect Hotspots to run analysis</p></div>
            )}
            {hotspots && (
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {hotspots.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: 'var(--card)', borderRadius: 8,
                    marginBottom: 8, border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--txt3)', width: 28 }}>
                      #{i+1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>
                        {String(h.location || '').slice(0, 45)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
                        {h.event_count} events · M{h.max_magnitude} max · {h.recent_activity} last 30d
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: riskColor(h.risk_score) }}>
                        {Number(h.risk_score || 0).toFixed(0)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--txt2)' }}>/ 100</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── PROXIMITY ALERTS ── */}
      {tab === 'alerts' && (
        <div className="grid-4-6">
          <Panel title=" Your Location">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              {[['lat','Latitude','0.1'],['lon','Longitude','0.1']].map(([k,l,s]) => (
                <div className="form-field" key={k}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" type="number" step={s}
                    value={proxForm[k]}
                    onChange={(e) => setProxForm((f) => ({ ...f, [k]: +e.target.value }))} />
                </div>
              ))}
              <div className="form-field">
                <label className="form-label">Search Radius</label>
                <select className="form-select" value={proxForm.radius_km}
                  onChange={(e) => setProxForm((f) => ({ ...f, radius_km: +e.target.value }))}>
                  {[50,100,200,500].map((r) => <option key={r} value={r}>{r} km</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Time Window</label>
                <select className="form-select" value={proxForm.hours_back}
                  onChange={(e) => setProxForm((f) => ({ ...f, hours_back: +e.target.value }))}>
                  {[[6,'6 hours'],[24,'24 hours'],[72,'3 days'],[168,'1 week']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <Btn full onClick={runProximity} disabled={aLoading} style={{ marginTop: 16 }}>
              {aLoading ? ' Searching…' : ' Check My Area'}
            </Btn>
          </Panel>

          <Panel title=" Nearby Events" badge={alerts !== null ? `${alerts.length} FOUND` : ''}>
            {aLoading && <div className="spinner" />}
            {!alerts && !aLoading && (
              <div className="empty-state"><div className="empty-icon"></div><p>Enter your location to check for nearby earthquakes</p></div>
            )}
            {alerts && alerts.length === 0 && (
              <div className="empty-state"><div className="empty-icon"></div><p>No earthquakes found near your location!</p></div>
            )}
            {alerts && alerts.map((a, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: 'var(--card)', borderRadius: 8,
                marginBottom: 8, borderLeft: `3px solid ${magColor(a.magnitude)}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: magColor(a.magnitude) }}>
                    M{a.magnitude}
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--txt2)',
                    background: 'var(--raised)', padding: '2px 8px', borderRadius: 4 }}>
                    {a.severity}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--txt)', margin: '4px 0' }}>{a.location}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--txt2)' }}>
                  <span> {Number(a.distance_km || 0).toFixed(1)} km</span>
                  <span> {Number(a.hours_ago || 0).toFixed(1)}h ago</span>
                  <span> {Number(a.depth || 0).toFixed(0)} km deep</span>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </>
  )
}
