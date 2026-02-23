import React from 'react'
import clsx from 'clsx'

// ── Panel ─────────────────────────────────────────────────────────────
export function Panel({ title, badge, children, className, style }) {
  return (
    <div className={clsx('panel', className)} style={style}>
      {title && (
        <div className="panel-header">
          <span className="panel-title">{title}</span>
          {badge && <span className="panel-badge">{badge}</span>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, accent }) {
  const colorMap = {
    plasma: 'var(--plasma)',
    hot:    'var(--hot)',
    ok:     'var(--ok)',
    warn:   'var(--warn)',
    pur:    'var(--pur)',
  }
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: colorMap[accent] || 'var(--txt)' }}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', full, onClick, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      className={clsx('btn', `btn-${variant}`, full && 'btn-full')}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// ── Filter Button ─────────────────────────────────────────────────────
export function FilterBtn({ label, active, onClick }) {
  return (
    <button className={clsx('filter-btn', active && 'active')} onClick={onClick}>
      {label}
    </button>
  )
}

// ── Mag Badge ─────────────────────────────────────────────────────────
export function MagBadge({ mag }) {
  const cls =
    mag >= 7   ? 'mag-great'    :
    mag >= 5.5 ? 'mag-major'    :
    mag >= 4   ? 'mag-moderate' : 'mag-minor'
  return <span className={`mag-badge ${cls}`}>M{Number(mag).toFixed(1)}</span>
}

// ── Status Dot ────────────────────────────────────────────────────────
export function StatusDot({ on, label }) {
  return (
    <div className="status-dot">
      <div className={clsx('dot', on ? 'dot-on' : 'dot-off')} />
      <span>{label}</span>
      <span className="mono" style={{ marginLeft: 'auto', fontSize: 9, color: on ? 'var(--ok)' : 'var(--hot)' }}>
        {on ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}

// ── Gauge ─────────────────────────────────────────────────────────────
export function Gauge({ value, max = 100 }) {
  const r    = 70, cx = 90, cy = 90
  const circ = Math.PI * r
  const pct  = Math.min(value / max, 1)
  const c    = value > 70 ? 'var(--hot)' : value > 30 ? 'var(--warn)' : 'var(--ok)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
      <svg width="180" height="110" viewBox="0 0 180 110" style={{ overflow: 'visible' }}>
        <path fill="none" stroke="var(--raised)" strokeWidth="12" strokeLinecap="round"
          d={`M${cx - r},${cy} a${r},${r} 0 0,1 ${r * 2},0`} />
        <path fill="none" stroke={c} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          d={`M${cx - r},${cy} a${r},${r} 0 0,1 ${r * 2},0`}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s' }} />
        <text x={cx} y={cy - 4} textAnchor="middle"
          style={{ fontFamily: 'var(--display)', fontSize: 36, fill: c }}>{value.toFixed(0)}</text>
        <text x={cx} y={cy + 18} textAnchor="middle"
          style={{ fontFamily: 'var(--font)', fontSize: 13, fill: 'var(--txt2)' }}>/ {max}</text>
      </svg>
    </div>
  )
}

// ── Seismic Wave Animation ─────────────────────────────────────────────
export function WaveAnim() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20 }}>
      {[40, 60, 100, 70, 40].map((h, i) => (
        <div key={i} style={{
          width: 3, height: `${h}%`, borderRadius: 2,
          background: 'var(--plasma)',
          animation: `wave 1.2s ease-in-out ${i * 100}ms infinite`,
        }} />
      ))}
      <style>{`
        @keyframes wave { 0%,100%{transform:scaleY(.4)} 50%{transform:scaleY(1)} }
      `}</style>
    </div>
  )
}

// ── Notification Toast ────────────────────────────────────────────────
export function Notification({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'var(--raised)', border: '1px solid var(--bdr2)',
      borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--txt)',
      boxShadow: '0 8px 32px rgba(0,0,0,.6)', maxWidth: 300,
      animation: 'slideUp .3s ease',
    }}>
      💡 {msg}
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}
