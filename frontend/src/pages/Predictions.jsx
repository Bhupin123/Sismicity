import React, { useState, useEffect } from 'react'
import { aiService, earthquakeService } from '../services/api'
import { Panel, Btn, Gauge } from '../components/UI'

// ── Preset locations ─────────────────────────────────────────────
const LOCATIONS = [
  { name: 'Kathmandu, Nepal',   lat: 27.72, lon: 85.32, depth: 10 },
  { name: 'Pokhara, Nepal',     lat: 28.21, lon: 83.99, depth: 12 },
  { name: 'Tokyo, Japan',       lat: 35.68, lon: 139.69, depth: 35 },
  { name: 'San Francisco, USA', lat: 37.77, lon: -122.42, depth: 8 },
  { name: 'Istanbul, Turkey',   lat: 41.01, lon: 28.96, depth: 15 },
  { name: 'Custom',             lat: null,  lon: null,  depth: null },
]

const DEFAULT = {
  depth: 10, lat: 27.72, lon: 85.32,
  rolling_count_7d: 8, rolling_count_30d: 35,
  rolling_mean_mag_30d: 4.2, days_since_last_major: 45,
}

// ── Color helpers ─────────────────────────────────────────────────
const magColor  = (m) => m >= 5.5 ? '#ff4444' : m >= 4 ? '#ffaa00' : '#00c864'
const riskColor = (l) => l === 'HIGH' ? '#ff4444' : l === 'MODERATE' ? '#ffaa00' : '#00c864'
const magLabel  = (m) => m >= 7 ? 'Great' : m >= 6 ? 'Strong' : m >= 5.5 ? 'Major'
                       : m >= 4 ? 'Moderate' : m >= 3 ? 'Light' : 'Minor'

// ── Simple slider input ───────────────────────────────────────────
function SliderField({ label, hint, icon, value, min, max, step, onChange, unit = '' }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 600 }}>
          {icon} {label}
        </span>
        <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>
        <span>{min}{unit}</span>
        <span style={{ color: 'var(--txt2)', fontSize: 11 }}>{hint}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ── Result metric card ────────────────────────────────────────────
function MetricCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: 'var(--raised)', borderRadius: 10, padding: '14px 16px',
      textAlign: 'center', border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--display)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function Predictions() {
  const [tab,      setTab]     = useState('magnitude')
  const [location, setLocation] = useState(LOCATIONS[0])
  const [form,     setForm]    = useState(DEFAULT)
  const [result,   setResult]  = useState(null)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState(null)
  const [autoFilled, setAutoFilled] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-fill rolling stats from your database on mount
  useEffect(() => {
    earthquakeService.getStats(30)
      .then(stats => {
        if (stats) {
          setForm(f => ({
            ...f,
            rolling_count_30d:    Math.round(stats.total   || 35),
            rolling_mean_mag_30d: parseFloat((stats.avg_mag || 4.2).toFixed(1)),
            rolling_count_7d:     Math.round((stats.total  || 35) / 4),
          }))
          setAutoFilled(true)
        }
      })
      .catch(() => {})
  }, [])

  // Update lat/lon/depth when location preset changes
  const handleLocationChange = (loc) => {
    setLocation(loc)
    if (loc.lat !== null) {
      setForm(f => ({ ...f, lat: loc.lat, lon: loc.lon, depth: loc.depth }))
    }
    setResult(null)
  }

  const run = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = tab === 'magnitude'
        ? await aiService.predictMagnitude(form)
        : await aiService.assessRisk(form)
      setResult(res)
    } catch (e) {
      setError(e.message || 'Prediction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          ['magnitude', 'Magnitude Prediction'],
          ['risk',      'Risk Assessment'],
        ].map(([k, l]) => (
          <button key={k}
            className={`filter-btn ${tab === k ? 'active' : ''}`}
            onClick={() => { setTab(k); setResult(null); setError(null) }}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {/* ── LEFT: Input panel ── */}
        <Panel title="Input Parameters" badge="ML MODEL">

          {/* Location preset selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              📍 Location
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LOCATIONS.map(loc => (
                <button key={loc.name}
                  onClick={() => handleLocationChange(loc)}
                  style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 600,
                    borderRadius: 6, cursor: 'pointer',
                    background: location.name === loc.name
                      ? 'rgba(0,200,255,0.2)' : 'var(--raised)',
                    border: location.name === loc.name
                      ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: location.name === loc.name ? 'var(--accent)' : 'var(--txt2)',
                    transition: 'all 0.15s',
                  }}>
                  {loc.name === 'Custom' ? '✏️ Custom' : loc.name.split(',')[0]}
                </button>
              ))}
            </div>

            {/* Custom lat/lon inputs */}
            {location.name === 'Custom' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 4 }}>Latitude</div>
                  <input className="form-input" type="number" step="0.01"
                    value={form.lat} onChange={e => set('lat', parseFloat(e.target.value))}
                    placeholder="e.g. 27.72" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 4 }}>Longitude</div>
                  <input className="form-input" type="number" step="0.01"
                    value={form.lon} onChange={e => set('lon', parseFloat(e.target.value))}
                    placeholder="e.g. 85.32" />
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 20px' }} />

          {/* Sliders */}
          <SliderField
            label="Depth" icon="⬇️" hint="How deep underground"
            value={form.depth} min={0} max={300} step={1} unit=" km"
            onChange={v => set('depth', v)}
          />
          <SliderField
            label="Recent Activity (7 days)" icon="📊" hint="Earthquakes in last week"
            value={form.rolling_count_7d} min={0} max={100} step={1} unit=" events"
            onChange={v => set('rolling_count_7d', v)}
          />
          <SliderField
            label="Recent Activity (30 days)" icon="📈" hint="Earthquakes in last month"
            value={form.rolling_count_30d} min={0} max={300} step={1} unit=" events"
            onChange={v => set('rolling_count_30d', v)}
          />
          <SliderField
            label="Average Magnitude (30 days)" icon="〰️" hint="Avg strength of recent quakes"
            value={form.rolling_mean_mag_30d} min={1} max={8} step={0.1}
            onChange={v => set('rolling_mean_mag_30d', v)}
          />
          <SliderField
            label="Days Since Last Major Quake" icon="⏱️" hint="Days since last M5.5+ event"
            value={form.days_since_last_major} min={0} max={365} step={1} unit=" days"
            onChange={v => set('days_since_last_major', v)}
          />

          {autoFilled && (
            <div style={{
              fontSize: 11, color: 'var(--ok)', marginBottom: 12,
              padding: '6px 10px', background: 'rgba(0,200,100,0.08)',
              borderRadius: 6, border: '1px solid rgba(0,200,100,0.2)',
            }}>
              ✓ Activity data auto-filled from your live database
            </div>
          )}

          <Btn full onClick={run} disabled={loading}>
            {loading ? 'Processing...'
              : tab === 'magnitude' ? 'Predict Magnitude'
              : 'Analyze Risk'}
          </Btn>

          {error && (
            <div style={{
              marginTop: 12, padding: 10, fontSize: 12,
              color: 'var(--hot)', background: 'rgba(255,61,61,.1)',
              border: '1px solid rgba(255,61,61,.2)', borderRadius: 8,
            }}>
              ⚠️ {error}
            </div>
          )}
        </Panel>

        {/* ── RIGHT: Result panel ── */}
        <Panel title="Result" badge="AI OUTPUT">
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--txt2)', marginTop: 16, fontSize: 13 }}>
                Running ML model...
              </p>
            </div>
          )}

          {!loading && !result && (
            <div className="empty-state">
              <div style={{ fontSize: 56, marginBottom: 12 }}>
                {tab === 'magnitude' ? '🌍' : '⚡'}
              </div>
              <p style={{ color: 'var(--txt2)', fontSize: 14, marginBottom: 8 }}>
                {tab === 'magnitude'
                  ? 'Set your location and parameters, then click Predict'
                  : 'Configure parameters to assess seismic risk'}
              </p>
              <p style={{ color: 'var(--txt3)', fontSize: 12 }}>
                Model trained on 282,987 global earthquakes (2016–2026)
              </p>
            </div>
          )}

          {/* Magnitude result */}
          {result && tab === 'magnitude' && (() => {
            const mag   = result.predicted_magnitude
            const color = magColor(mag)
            const label = magLabel(mag)
            return (
              <>
                {/* Big magnitude display */}
                <div style={{ textAlign: 'center', padding: '28px 0 20px' }}>
                  <div style={{
                    fontSize: 90, fontWeight: 900, lineHeight: 1,
                    color, fontFamily: 'var(--display)',
                    textShadow: `0 0 40px ${color}66`,
                  }}>
                    M{mag}
                  </div>
                  <div style={{
                    marginTop: 8, fontSize: 18, fontWeight: 700, color,
                    textTransform: 'uppercase', letterSpacing: 2,
                  }}>
                    {label} Earthquake
                  </div>
                  <div style={{ color: 'var(--txt2)', fontSize: 13, marginTop: 4 }}>
                    Predicted for {location.name}
                  </div>
                </div>

                {/* Magnitude scale bar */}
                <div style={{ margin: '0 0 20px', padding: '0 8px' }}>
                  <div style={{ position: 'relative', height: 8, borderRadius: 4,
                    background: 'linear-gradient(to right, #00c864, #ffaa00, #ff4444)',
                    marginBottom: 4 }}>
                    <div style={{
                      position: 'absolute', top: -4, width: 16, height: 16,
                      borderRadius: '50%', background: color,
                      border: '2px solid #fff',
                      left: `${Math.min(95, Math.max(2, ((mag - 1) / 8) * 100))}%`,
                      transform: 'translateX(-50%)',
                      boxShadow: `0 0 8px ${color}`,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 10, color: 'var(--txt3)' }}>
                    <span>M1 Minor</span>
                    <span>M4 Moderate</span>
                    <span>M7 Major</span>
                    <span>M9 Great</span>
                  </div>
                </div>

                {/* Metric cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <MetricCard label="Category"   value={result.category}       color={color} />
                  <MetricCard label="Confidence" value={`${result.confidence}%`} color="var(--accent)" />
                  <MetricCard label="Depth Input" value={`${form.depth}km`}    color="var(--txt2)" />
                </div>

                {/* Plain language explanation */}
                <div style={{
                  padding: 14, background: 'var(--raised)', borderRadius: 10,
                  border: `1px solid ${color}33`, fontSize: 13,
                  color: 'var(--txt)', lineHeight: 1.8,
                }}>
                  <div style={{ fontWeight: 700, color, marginBottom: 6 }}>
                    What does this mean?
                  </div>
                  {mag >= 6.0 && (
                    <p>A M{mag} earthquake is <strong>very destructive</strong>. It can cause severe damage to buildings, trigger landslides, and be felt hundreds of kilometers away. Immediate preparedness action is recommended.</p>
                  )}
                  {mag >= 5.0 && mag < 6.0 && (
                    <p>A M{mag} earthquake causes <strong>moderate to significant damage</strong> near the epicenter. Buildings may sustain damage. It will be strongly felt by most people in the area.</p>
                  )}
                  {mag >= 4.0 && mag < 5.0 && (
                    <p>A M{mag} earthquake will be <strong>widely felt</strong> but rarely causes serious damage to well-constructed buildings. Some minor items may fall or break.</p>
                  )}
                  {mag < 4.0 && (
                    <p>A M{mag} earthquake is <strong>minor</strong> and may not even be noticed by most people. No significant damage is expected at this magnitude.</p>
                  )}
                </div>
              </>
            )
          })()}

          {/* Risk result */}
          {result && tab === 'risk' && (() => {
            const color = riskColor(result.risk_level)
            return (
              <>
                <Gauge value={result.probability} max={100} />

                <div style={{ textAlign: 'center', margin: '12px 0 20px' }}>
                  <div style={{
                    fontSize: 32, fontWeight: 900, color,
                    fontFamily: 'var(--display)', letterSpacing: 1,
                  }}>
                    {result.risk_level} RISK
                  </div>
                  <div style={{ color: 'var(--txt2)', fontSize: 14, marginTop: 4 }}>
                    {result.probability}% probability of a major earthquake
                  </div>
                  <div style={{ color: 'var(--txt3)', fontSize: 12, marginTop: 2 }}>
                    Based on current seismic conditions at {location.name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <MetricCard label="Risk Level"    value={result.risk_level} color={color} />
                  <MetricCard label="Probability"   value={`${result.probability}%`} color={color} />
                </div>

                <div style={{
                  padding: 14, background: 'var(--raised)', borderRadius: 10,
                  border: `1px solid ${color}33`, fontSize: 13,
                  color: 'var(--txt)', lineHeight: 1.8,
                }}>
                  <div style={{ fontWeight: 700, color, marginBottom: 6 }}>
                    What should you do?
                  </div>
                  {result.risk_level === 'HIGH' && (
                    <p>Seismic risk is <strong>elevated</strong> in this area right now. Review your emergency plan, ensure your earthquake kit is stocked, and be aware of safe spots in your home or office.</p>
                  )}
                  {result.risk_level === 'MODERATE' && (
                    <p>Seismic risk is at a <strong>moderate level</strong>. Standard earthquake preparedness is recommended. Keep an emergency kit ready and know your building's safety features.</p>
                  )}
                  {result.risk_level === 'LOW' && (
                    <p>Current seismic conditions show <strong>low risk</strong> in this area. Continue normal activities but maintain basic earthquake awareness and preparedness.</p>
                  )}
                </div>
              </>
            )
          })()}
        </Panel>
      </div>
    </>
  )
}