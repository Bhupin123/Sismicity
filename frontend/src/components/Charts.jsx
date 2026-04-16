import React from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'

const TOOLTIP_STYLE = {
  backgroundColor: '#0e1c2f',
  border: '1px solid rgba(0,200,255,.18)',
  borderRadius: 8,
  color: '#c8dff0',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const TICK_STYLE  = { fill: '#5a7a99', fontSize: 11 }
const GRID_COLOR  = 'rgba(255,255,255,.04)'

// ── Area / Line Chart ──────────────────────────────────────────────
export function SeismoAreaChart({
  data,
  dataKey = 'count',
  color   = '#00c8ff',
  height  = 220,
  xKey    = 'period',
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} />
        <XAxis
          dataKey={xKey}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => String(v).slice(0, 10)}
        />
        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.35 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Bar Chart ──────────────────────────────────────────────────────
export function SeismoBarChart({
  data,
  dataKey    = 'count',
  color      = '#00c8ff',
  xKey       = 'place',
  height     = 220,
  horizontal = false,
}) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
          <XAxis
            type="number"
            tick={TICK_STYLE}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey={xKey}
            tick={{ ...TICK_STYLE, width: 130 }}
            tickLine={false}
            axisLine={false}
            width={130}
            tickFormatter={v => String(v).slice(0, 22)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(0,200,255,.05)' }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid stroke={GRID_COLOR} />
        <XAxis
          dataKey={xKey}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => String(v).slice(0, 8)}
        />
        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(0,200,255,.05)' }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Donut Chart ────────────────────────────────────────────────────
export function SeismoDonutChart({ slices = [], height = 220 }) {
  if (!slices.length) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="56%"
          outerRadius="76%"
          paddingAngle={3}
          strokeWidth={0}
        >
          {slices.map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, n) => [v.toLocaleString(), n]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={v => (
            <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{v}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}