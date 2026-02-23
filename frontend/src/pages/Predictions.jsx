import React, { useState } from 'react'
import { aiService } from '../services/api'
import { Panel, Btn, Gauge } from '../components/UI'

function Field({ label, hint, children }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}

export default function Predictions() {
  const [tab, setTab] = useState('magnitude')
  const [form, setForm] = useState({
    depth: 10, lat: 28, lon: 84,
    rolling_count_7d: 10, rolling_count_30d: 50,
    rolling_mean_mag_30d: 4.5, days_since_last_major: 30,
  })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const run = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = tab === 'magnitude'
        ? await aiService.predictMagnitude(form)
        : await aiService.assessRisk(form)
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const colorForMag  = (m) => m >= 5.5 ? 'var(--hot)' : m >= 4 ? 'var(--warn)' : 'var(--ok)'
  const colorForRisk = (l) => l === 'HIGH' ? 'var(--hot)' : l === 'MODERATE' ? 'var(--warn)' : 'var(--ok)'

  const FIELDS = [
    ['depth',                'Depth (km)',           0, 700, 1,   'How deep below the surface'],
    ['lat',                  'Latitude',            -90, 90, 0.1, 'e.g. Kathmandu = 27.7'],
    ['lon',                  'Longitude',          -180,180, 0.1, 'e.g. Kathmandu = 85.3'],
    ['rolling_count_7d',     '7-Day Event Count',    0, 200, 1,   'Earthquakes in last 7 days'],
    ['rolling_count_30d',    '30-Day Event Count',   0, 500, 1,   'Earthquakes in last 30 days'],
    ['rolling_mean_mag_30d', '30-Day Avg Magnitude', 0, 9,   0.1, 'Average magnitude over 30 days'],
    ['days_since_last_major','Days Since Last Major',0,3650,  1,   'Days since last M5.5+ event'],
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[['magnitude',' Magnitude Prediction'],['risk',' Risk Assessment']].map(([k,l]) => (
          <button key={k} className={`filter-btn ${tab === k ? 'active' : ''}`}
            onClick={() => { setTab(k); setResult(null); setError(null) }}>{l}</button>
        ))}
      </div>

      <div className="grid-2">
        {/* Form */}
        <Panel title={tab === 'magnitude' ? ' Input Parameters' : ' Input Parameters'} badge="ML MODEL">
          <div className="form-grid">
            {FIELDS.map(([key, label, min, max, step, hint]) => (
              <Field key={key} label={label} hint={hint}>
                <input className="form-input" type="number"
                  min={min} max={max} step={step} value={form[key]}
                  onChange={(e) => set(key, parseFloat(e.target.value))} />
              </Field>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <Btn full onClick={run} disabled={loading}>
              {loading ? ' Processing…'
                : tab === 'magnitude' ? ' Predict Magnitude'
                : ' Analyze Risk'}
            </Btn>
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,61,61,.1)',
              border: '1px solid rgba(255,61,61,.2)', borderRadius: 8,
              fontSize: 12, color: 'var(--hot)' }}>
              ⚠️ {error}
            </div>
          )}
        </Panel>

        {/* Result */}
        <Panel title=" Result" badge="AI OUTPUT">
          {loading && <div className="spinner" />}
          {!loading && !result && (
            <div className="empty-state">
              <div className="empty-icon">{tab === 'magnitude' ? '' : ''}</div>
              <p>Fill in parameters and click predict</p>
            </div>
          )}

          {result && tab === 'magnitude' && (
            <>
              <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 80, lineHeight: 1,
                  color: colorForMag(result.predicted_magnitude),
                }}>
                  M{result.predicted_magnitude}
                </div>
                <div style={{ color: 'var(--txt2)', fontSize: 13, marginTop: 6 }}>
                  Predicted Magnitude
                </div>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <div className="result-val" style={{ color: colorForMag(result.predicted_magnitude), fontSize: 20 }}>
                    {result.category}
                  </div>
                  <div className="result-lbl">Category</div>
                </div>
                <div className="result-item">
                  <div className="result-val">{result.confidence}%</div>
                  <div className="result-lbl">Confidence</div>
                </div>
                <div className="result-item">
                  <div className="result-val" style={{ fontSize: 24 }}>
                    {result.predicted_magnitude >= 5.5 ? '' : result.predicted_magnitude >= 4 ? '' : ''}
                  </div>
                  <div className="result-lbl">Alert</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--raised)', borderRadius: 8,
                fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7 }}>
                {result.category === 'Major'
                  ? ' Major earthquake predicted. This level can cause significant structural damage.'
                  : result.category === 'Moderate'
                  ? ' Moderate earthquake predicted. May be widely felt, minor damage possible.'
                  : ' Minor earthquake predicted. Usually not felt or causes very little damage.'}
              </div>
            </>
          )}

          {result && tab === 'risk' && (
            <>
              <Gauge value={result.probability} max={100} />
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 28,
                  color: colorForRisk(result.risk_level),
                }}>
                  {result.risk_level} RISK
                </div>
                <div style={{ color: 'var(--txt2)', fontSize: 13, marginTop: 6 }}>
                  {result.probability}% probability of a major earthquake
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--raised)', borderRadius: 8,
                fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7 }}>
                {result.risk_level === 'HIGH'
                  ? '🔴 High seismic risk — elevated probability of a major event in this area.'
                  : result.risk_level === 'MODERATE'
                  ? '🟡 Moderate risk — standard monitoring recommended.'
                  : '🟢 Low risk conditions — no immediate concern based on current data.'}
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  )
}
