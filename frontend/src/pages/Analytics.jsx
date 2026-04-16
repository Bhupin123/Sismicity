import React, { useEffect, useState, useRef, useCallback } from 'react'
import { earthquakeService } from '../services/api'
import { useFilters } from '../hooks'
import { Panel, KpiCard } from '../components/UI'
import { SeismoAreaChart, SeismoBarChart, SeismoDonutChart } from '../components/Charts'
import FilterBar from '../components/FilterBar'

// ══════════════════════════════════════════════════════════════════
//  COUNTRY + BOUNDING BOX DATA
//  bbox: [minLon, minLat, maxLon, maxLat]
// ══════════════════════════════════════════════════════════════════
const COUNTRIES = [
  { name: 'Afghanistan',          bbox: [60.5,29.4,74.9,38.5] },
  { name: 'Albania',              bbox: [19.3,39.6,21.1,42.7] },
  { name: 'Algeria',              bbox: [-8.7,18.9,12.0,37.1] },
  { name: 'Argentina',            bbox: [-73.6,-55.1,-53.6,-21.8] },
  { name: 'Armenia',              bbox: [43.4,38.8,46.6,41.3] },
  { name: 'Australia',            bbox: [112.9,-43.7,153.6,-10.7] },
  { name: 'Azerbaijan',           bbox: [44.8,38.4,50.4,41.9] },
  { name: 'Bangladesh',           bbox: [88.0,20.7,92.7,26.6] },
  { name: 'Bolivia',              bbox: [-69.7,-22.9,-57.5,-9.7] },
  { name: 'Brazil',               bbox: [-73.9,-33.8,-28.8,5.3] },
  { name: 'Cambodia',             bbox: [102.3,10.4,107.6,14.7] },
  { name: 'Canada',               bbox: [-141.0,41.7,-52.6,83.1] },
  { name: 'Chile',                bbox: [-75.6,-55.9,-66.1,-17.5] },
  { name: 'China',                bbox: [73.5,18.2,134.8,53.6] },
  { name: 'Colombia',             bbox: [-79.0,-4.2,-66.9,12.5] },
  { name: 'Costa Rica',           bbox: [-85.9,8.0,-82.6,11.2] },
  { name: 'Croatia',              bbox: [13.5,42.4,19.4,46.5] },
  { name: 'Ecuador',              bbox: [-80.9,-5.0,-75.2,1.4] },
  { name: 'Egypt',                bbox: [24.7,22.0,37.1,31.7] },
  { name: 'El Salvador',          bbox: [-90.1,13.1,-87.7,14.4] },
  { name: 'Ethiopia',             bbox: [33.0,3.4,47.9,14.9] },
  { name: 'Fiji',                 bbox: [177.0,-19.2,-178.0,-15.7] },
  { name: 'France',               bbox: [-5.1,42.3,8.2,51.1] },
  { name: 'Georgia',              bbox: [40.0,41.1,46.7,43.6] },
  { name: 'Greece',               bbox: [20.1,34.8,26.6,41.7] },
  { name: 'Guatemala',            bbox: [-92.2,13.7,-88.2,17.8] },
  { name: 'Honduras',             bbox: [-89.4,13.0,-83.2,16.5] },
  { name: 'India',                bbox: [68.1,8.4,97.4,37.1] },
  { name: 'Indonesia',            bbox: [95.0,-11.0,141.0,6.1] },
  { name: 'Iran',                 bbox: [44.0,25.1,63.3,39.8] },
  { name: 'Iraq',                 bbox: [38.8,29.1,48.6,37.4] },
  { name: 'Italy',                bbox: [6.6,36.5,18.5,47.1] },
  { name: 'Jamaica',              bbox: [-78.3,17.7,-76.2,18.5] },
  { name: 'Japan',                bbox: [129.5,31.0,145.8,45.5] },
  { name: 'Jordan',               bbox: [34.9,29.2,39.3,33.4] },
  { name: 'Kazakhstan',           bbox: [50.3,40.6,87.4,55.4] },
  { name: 'Kenya',                bbox: [33.9,-4.7,42.0,5.0] },
  { name: 'Kyrgyzstan',           bbox: [69.3,39.2,80.3,43.2] },
  { name: 'Laos',                 bbox: [100.1,13.9,107.7,22.5] },
  { name: 'Lebanon',              bbox: [35.1,33.1,36.6,34.7] },
  { name: 'Libya',                bbox: [9.4,19.5,25.1,33.2] },
  { name: 'Madagascar',           bbox: [43.2,-25.6,50.5,-12.0] },
  { name: 'Malaysia',             bbox: [99.6,0.9,119.3,7.4] },
  { name: 'Mexico',               bbox: [-117.1,14.5,-86.7,32.7] },
  { name: 'Mongolia',             bbox: [87.7,41.6,119.9,52.1] },
  { name: 'Morocco',              bbox: [-13.2,27.7,-1.0,35.9] },
  { name: 'Mozambique',           bbox: [30.2,-26.9,40.8,-10.5] },
  { name: 'Myanmar',              bbox: [92.2,9.8,101.2,28.5] },
  { name: 'Nepal',                bbox: [80.1,26.4,88.2,30.4] },
  { name: 'New Zealand',          bbox: [166.4,-46.6,178.6,-34.4] },
  { name: 'Nicaragua',            bbox: [-87.7,10.7,-83.1,15.0] },
  { name: 'Nigeria',              bbox: [2.7,4.3,14.7,13.9] },
  { name: 'North Korea',          bbox: [124.3,37.7,130.7,42.9] },
  { name: 'Norway',               bbox: [4.5,57.9,31.1,71.2] },
  { name: 'Pakistan',             bbox: [60.9,23.7,77.8,37.1] },
  { name: 'Panama',               bbox: [-83.0,7.2,-77.2,9.6] },
  { name: 'Papua New Guinea',     bbox: [141.0,-11.6,156.0,-1.3] },
  { name: 'Peru',                 bbox: [-81.3,-18.4,-68.7,-0.0] },
  { name: 'Philippines',          bbox: [116.9,4.6,126.6,20.9] },
  { name: 'Portugal',             bbox: [-9.5,36.8,-6.2,42.1] },
  { name: 'Romania',              bbox: [20.3,43.6,29.7,48.3] },
  { name: 'Russia',               bbox: [19.6,41.2,190.0,81.9] },
  { name: 'Saudi Arabia',         bbox: [36.5,16.4,55.7,32.2] },
  { name: 'Solomon Islands',      bbox: [155.5,-11.8,166.9,-5.1] },
  { name: 'South Korea',          bbox: [126.1,34.3,129.6,38.6] },
  { name: 'Spain',                bbox: [-9.3,36.0,4.3,43.8] },
  { name: 'Sudan',                bbox: [21.8,8.7,38.6,22.2] },
  { name: 'Tajikistan',           bbox: [67.3,36.7,75.2,41.0] },
  { name: 'Tanzania',             bbox: [29.3,-11.7,40.4,-1.0] },
  { name: 'Thailand',             bbox: [97.3,5.6,105.6,20.5] },
  { name: 'Tonga',                bbox: [-175.7,-21.5,-173.7,-15.6] },
  { name: 'Tunisia',              bbox: [8.2,30.2,11.6,37.5] },
  { name: 'Turkey',               bbox: [25.7,35.8,44.8,42.1] },
  { name: 'Turkmenistan',         bbox: [52.4,35.1,66.7,42.8] },
  { name: 'Uganda',               bbox: [29.6,-1.5,35.0,4.2] },
  { name: 'Ukraine',              bbox: [22.1,44.4,40.2,52.4] },
  { name: 'United States',        bbox: [-124.8,24.4,-66.9,49.4], hasStates: true },
  { name: 'Uzbekistan',           bbox: [56.0,37.2,73.2,45.6] },
  { name: 'Vanuatu',              bbox: [166.5,-20.2,170.2,-13.1] },
  { name: 'Venezuela',            bbox: [-73.3,0.6,-59.8,12.2] },
  { name: 'Vietnam',              bbox: [102.1,8.4,109.5,23.4] },
  { name: 'Yemen',                bbox: [42.5,12.1,54.5,19.0] },
  { name: 'Zimbabwe',             bbox: [25.2,-22.4,33.1,-15.6] },
]

const US_STATES = [
  { name: 'Alabama',        bbox: [-88.5,30.1,-84.9,35.0] },
  { name: 'Alaska',         bbox: [-168.0,54.5,-130.0,71.5] },
  { name: 'Arizona',        bbox: [-114.8,31.3,-109.0,37.0] },
  { name: 'Arkansas',       bbox: [-94.6,33.0,-89.6,36.5] },
  { name: 'California',     bbox: [-124.4,32.5,-114.1,42.0] },
  { name: 'Colorado',       bbox: [-109.1,36.9,-102.0,41.0] },
  { name: 'Connecticut',    bbox: [-73.7,41.0,-71.8,42.1] },
  { name: 'Florida',        bbox: [-87.6,24.5,-80.0,31.0] },
  { name: 'Georgia',        bbox: [-85.6,30.4,-81.0,35.0] },
  { name: 'Hawaii',         bbox: [-160.2,18.9,-154.8,22.2] },
  { name: 'Idaho',          bbox: [-117.2,42.0,-111.0,49.0] },
  { name: 'Illinois',       bbox: [-91.5,36.97,-87.5,42.5] },
  { name: 'Indiana',        bbox: [-88.1,37.8,-84.8,41.8] },
  { name: 'Iowa',           bbox: [-96.6,40.4,-90.1,43.5] },
  { name: 'Kansas',         bbox: [-102.1,37.0,-94.6,40.0] },
  { name: 'Kentucky',       bbox: [-89.6,36.5,-81.9,39.1] },
  { name: 'Louisiana',      bbox: [-94.0,28.9,-88.8,33.0] },
  { name: 'Maine',          bbox: [-71.1,43.1,-67.0,47.5] },
  { name: 'Maryland',       bbox: [-79.5,37.9,-75.0,39.7] },
  { name: 'Massachusetts',  bbox: [-73.5,41.2,-69.9,42.9] },
  { name: 'Michigan',       bbox: [-90.4,41.7,-82.4,48.3] },
  { name: 'Minnesota',      bbox: [-97.2,43.5,-89.5,49.4] },
  { name: 'Mississippi',    bbox: [-91.7,30.2,-88.1,35.0] },
  { name: 'Missouri',       bbox: [-95.8,36.0,-89.1,40.6] },
  { name: 'Montana',        bbox: [-116.0,44.4,-104.0,49.0] },
  { name: 'Nebraska',       bbox: [-104.1,40.0,-95.3,43.0] },
  { name: 'Nevada',         bbox: [-120.0,35.0,-114.0,42.0] },
  { name: 'New Hampshire',  bbox: [-72.6,42.7,-70.7,45.3] },
  { name: 'New Jersey',     bbox: [-75.6,38.9,-73.9,41.4] },
  { name: 'New Mexico',     bbox: [-109.1,31.3,-103.0,37.0] },
  { name: 'New York',       bbox: [-79.8,40.5,-71.9,45.0] },
  { name: 'North Carolina', bbox: [-84.3,33.8,-75.5,36.6] },
  { name: 'North Dakota',   bbox: [-104.1,45.9,-96.6,49.0] },
  { name: 'Ohio',           bbox: [-84.8,38.4,-80.5,42.3] },
  { name: 'Oklahoma',       bbox: [-103.0,33.6,-94.4,37.0] },
  { name: 'Oregon',         bbox: [-124.6,42.0,-116.5,46.3] },
  { name: 'Pennsylvania',   bbox: [-80.5,39.7,-74.7,42.3] },
  { name: 'Rhode Island',   bbox: [-71.9,41.1,-71.1,42.0] },
  { name: 'South Carolina', bbox: [-83.4,32.0,-78.5,35.2] },
  { name: 'South Dakota',   bbox: [-104.1,42.5,-96.4,45.9] },
  { name: 'Tennessee',      bbox: [-90.3,35.0,-81.6,36.7] },
  { name: 'Texas',          bbox: [-106.6,25.8,-93.5,36.5] },
  { name: 'Utah',           bbox: [-114.1,37.0,-109.0,42.0] },
  { name: 'Vermont',        bbox: [-73.4,42.7,-71.5,45.0] },
  { name: 'Virginia',       bbox: [-83.7,36.5,-75.2,39.5] },
  { name: 'Washington',     bbox: [-124.8,45.5,-116.9,49.0] },
  { name: 'West Virginia',  bbox: [-82.6,37.2,-77.7,40.6] },
  { name: 'Wisconsin',      bbox: [-92.9,42.5,-86.2,47.1] },
  { name: 'Wyoming',        bbox: [-111.1,41.0,-104.0,45.0] },
]

// ══════════════════════════════════════════════════════════════════
//  USGS FETCH
// ══════════════════════════════════════════════════════════════════
async function fetchUSGS({ bbox, starttime, endtime, minmagnitude = 0 }) {
  const [minlon, minlat, maxlon, maxlat] = bbox
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query')
  url.searchParams.set('format',       'geojson')
  url.searchParams.set('starttime',    starttime)
  url.searchParams.set('endtime',      endtime)
  url.searchParams.set('minlatitude',  minlat)
  url.searchParams.set('maxlatitude',  maxlat)
  url.searchParams.set('minlongitude', minlon)
  url.searchParams.set('maxlongitude', maxlon)
  url.searchParams.set('minmagnitude', minmagnitude)
  url.searchParams.set('orderby',      'time')
  url.searchParams.set('limit',        '20000')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`USGS error ${res.status}`)
  const json = await res.json()
  return json.features || []
}

// ══════════════════════════════════════════════════════════════════
//  TRANSFORM RAW USGS FEATURES → analytics shape
// ══════════════════════════════════════════════════════════════════
function transformFeatures(features) {
  if (!features.length) return null

  const mags   = features.map(f => f.properties.mag).filter(m => m != null)
  const depths = features.map(f => f.geometry.coordinates[2]).filter(d => d != null)
  const times  = features.map(f => f.properties.time)
  const major  = mags.filter(m => m >= 5.5).length
  const moderate = mags.filter(m => m >= 4 && m < 5.5).length
  const minor  = mags.filter(m => m < 4).length

  // monthly timeline
  const monthMap = {}
  features.forEach(f => {
    const d = new Date(f.properties.time)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!monthMap[key]) monthMap[key] = { period: key, count: 0, mag_sum: 0, max_mag: 0 }
    monthMap[key].count++
    monthMap[key].mag_sum += (f.properties.mag || 0)
    if ((f.properties.mag || 0) > monthMap[key].max_mag) monthMap[key].max_mag = f.properties.mag
  })
  const monthly = Object.values(monthMap)
    .sort((a,b) => a.period.localeCompare(b.period))
    .map(r => ({ ...r, avg_mag: r.count ? +(r.mag_sum / r.count).toFixed(2) : 0 }))

  // yearly timeline
  const yearMap = {}
  features.forEach(f => {
    const key = String(new Date(f.properties.time).getFullYear())
    if (!yearMap[key]) yearMap[key] = { period: key, count: 0, mag_sum: 0, max_mag: 0 }
    yearMap[key].count++
    yearMap[key].mag_sum += (f.properties.mag || 0)
    if ((f.properties.mag || 0) > yearMap[key].max_mag) yearMap[key].max_mag = f.properties.mag
  })
  const yearly = Object.values(yearMap)
    .sort((a,b) => a.period.localeCompare(b.period))
    .map(r => ({ ...r, avg_mag: r.count ? +(r.mag_sum / r.count).toFixed(2) : 0 }))

  const avg_mag   = mags.length ? +(mags.reduce((a,b)=>a+b,0) / mags.length).toFixed(2) : 0
  const max_mag   = mags.length ? +Math.max(...mags).toFixed(1) : 0
  const min_mag   = mags.length ? +Math.min(...mags).toFixed(1) : 0
  const avg_depth = depths.length ? +(depths.reduce((a,b)=>a+b,0) / depths.length).toFixed(1) : 0
  const date_earliest = times.length ? new Date(Math.min(...times)).toISOString().slice(0,10) : ''
  const date_latest   = times.length ? new Date(Math.max(...times)).toISOString().slice(0,10) : ''

  return {
    stats: { total: features.length, avg_mag, max_mag, min_mag, avg_depth, major_count: major, moderate_count: moderate, minor_count: minor, date_earliest, date_latest },
    monthly,
    yearly,
  }
}

// ══════════════════════════════════════════════════════════════════
//  SEARCHABLE DROPDOWN
// ══════════════════════════════════════════════════════════════════
function SearchDropdown({ options, value, onChange, placeholder }) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const ref                 = useRef()

  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (opt) => { onChange(opt); setQuery(''); setOpen(false) }
  const clear  = () => { onChange(null); setQuery('') }

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 220 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 8, cursor: 'pointer', color: value ? 'var(--txt1)' : 'var(--txt3)',
          fontSize: 13, userSelect: 'none', gap: 8,
          boxShadow: open ? '0 0 0 2px rgba(0,200,255,0.3)' : 'none',
          transition: 'box-shadow 0.2s'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? value.name : placeholder}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {value && (
            <span onClick={(e) => { e.stopPropagation(); clear() }}
              style={{ color: 'var(--txt3)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>✕</span>
          )}
          <span style={{ color: 'var(--txt3)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 8, zIndex: 999, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxHeight: 280
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', padding: '6px 10px', background: 'var(--surface3)',
                border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--txt1)', fontSize: 12, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            {filtered.length === 0
              ? <div style={{ padding: '12px', color: 'var(--txt3)', fontSize: 12, textAlign: 'center' }}>No results</div>
              : filtered.map(opt => (
                  <div key={opt.name}
                    onClick={() => select(opt)}
                    style={{
                      padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                      color: value?.name === opt.name ? '#00c8ff' : 'var(--txt1)',
                      background: value?.name === opt.name ? 'rgba(0,200,255,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = value?.name === opt.name ? 'rgba(0,200,255,0.08)' : 'transparent'}
                  >
                    {opt.name}
                    {opt.hasStates && <span style={{ fontSize: 10, color: 'var(--txt3)' }}>has states</span>}
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  DATE RANGE PRESETS
// ══════════════════════════════════════════════════════════════════
const PRESETS = [
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year',  days: 365 },
  { label: '5 years', days: 1825 },
  { label: 'Custom',  days: null },
]

function dateNDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function today() { return new Date().toISOString().slice(0, 10) }

// ══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function Analytics() {
  const { params }   = useFilters()

  // DB-mode state
  const [dbStats,   setDbStats]   = useState(null)
  const [dbMonthly, setDbMonthly] = useState([])
  const [dbYearly,  setDbYearly]  = useState([])
  const [dbLoading, setDbLoading] = useState(true)

  // USGS-mode state
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [selectedState,   setSelectedState]   = useState(null)
  const [preset,          setPreset]          = useState(PRESETS[2]) // 90 days default
  const [customStart,     setCustomStart]     = useState(dateNDaysAgo(90))
  const [customEnd,       setCustomEnd]       = useState(today())
  const [minMag,          setMinMag]          = useState(0)
  const [usgsData,        setUsgsData]        = useState(null)
  const [usgsLoading,     setUsgsLoading]     = useState(false)
  const [usgsError,       setUsgsError]       = useState(null)

  const mode = selectedCountry ? 'usgs' : 'db'

  // ── DB fetch (only when no country selected) ───────────────────
  useEffect(() => {
    if (mode !== 'db') return
    setDbLoading(true)
    Promise.all([
      earthquakeService.getStats(params),
      earthquakeService.getTimeline({ ...params, group_by: 'month' }),
      earthquakeService.getTimeline({ group_by: 'year' }),
    ]).then(([s, m, y]) => {
      setDbStats(s)
      setDbMonthly(m || [])
      setDbYearly(y  || [])
      setDbLoading(false)
    })
  }, [JSON.stringify(params), mode])

  // ── USGS fetch (when country is selected) ─────────────────────
  const fetchCountryData = useCallback(async () => {
    if (!selectedCountry) return
    setUsgsLoading(true)
    setUsgsError(null)
    setUsgsData(null)

    const bbox  = selectedState ? selectedState.bbox : selectedCountry.bbox
    const start = preset.days ? dateNDaysAgo(preset.days) : customStart
    const end   = preset.days ? today() : customEnd

    try {
      const features = await fetchUSGS({ bbox, starttime: start, endtime: end, minmagnitude: minMag })
      setUsgsData(transformFeatures(features))
    } catch (err) {
      setUsgsError(err.message || 'Failed to fetch USGS data')
    } finally {
      setUsgsLoading(false)
    }
  }, [selectedCountry, selectedState, preset, customStart, customEnd, minMag])

  useEffect(() => {
    if (selectedCountry) fetchCountryData()
  }, [selectedCountry, selectedState, preset, customStart, customEnd, minMag])

  // ── When country changes, reset state selection ────────────────
  useEffect(() => { setSelectedState(null) }, [selectedCountry])

  // ── Derive display values ──────────────────────────────────────
  const stats   = mode === 'usgs' ? usgsData?.stats   : dbStats
  const monthly = mode === 'usgs' ? usgsData?.monthly : dbMonthly
  const yearly  = mode === 'usgs' ? usgsData?.yearly  : dbYearly
  const loading = mode === 'usgs' ? usgsLoading        : dbLoading

  const donut = stats ? [
    { label: 'Minor (<M4)',       value: stats.minor_count,    color: '#00e676' },
    { label: 'Moderate (M4–5.5)', value: stats.moderate_count, color: '#ff9f1c' },
    { label: 'Major (≥M5.5)',     value: stats.major_count,    color: '#ff3d3d' },
  ] : []

  const tableRows = stats ? [
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
  ] : []

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* ── TOP CONTROLS ── */}
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'flex-end'
      }}>
        {/* Country */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.5px' }}>
            COUNTRY / REGION
          </div>
          <SearchDropdown
            options={COUNTRIES}
            value={selectedCountry}
            onChange={setSelectedCountry}
            placeholder="All countries (DB)"
          />
        </div>

        {/* State (only if country has states) */}
        {selectedCountry?.hasStates && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.5px' }}>
              STATE
            </div>
            <SearchDropdown
              options={US_STATES}
              value={selectedState}
              onChange={setSelectedState}
              placeholder="All states"
            />
          </div>
        )}

        {/* Time preset — only shown in USGS mode */}
        {selectedCountry && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.5px' }}>
              TIME RANGE
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => setPreset(p)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: preset.label === p.label ? '#00c8ff' : 'var(--surface3)',
                    color: preset.label === p.label ? '#0a1628' : 'var(--txt2)',
                    transition: 'all 0.15s'
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom date range */}
        {selectedCountry && preset.days === null && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.5px' }}>FROM</div>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ padding: '7px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--txt1)', fontSize: 12 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.5px' }}>TO</div>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ padding: '7px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--txt1)', fontSize: 12 }} />
            </div>
          </div>
        )}

        {/* Min magnitude */}
        {selectedCountry && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.5px' }}>
              MIN MAG: M{minMag.toFixed(1)}
            </div>
            <input type="range" min={0} max={8} step={0.5} value={minMag}
              onChange={e => setMinMag(parseFloat(e.target.value))}
              style={{ width: 120, accentColor: '#00c8ff' }} />
          </div>
        )}

        {/* Mode badge */}
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: mode === 'usgs' ? 'rgba(0,200,255,0.15)' : 'rgba(0,230,118,0.15)',
            color: mode === 'usgs' ? '#00c8ff' : '#00e676',
            border: `1px solid ${mode === 'usgs' ? 'rgba(0,200,255,0.3)' : 'rgba(0,230,118,0.3)'}`,
            letterSpacing: '0.5px'
          }}>
            {mode === 'usgs' ? '🛰 USGS LIVE' : '🗄 DATABASE'}
          </span>
        </div>
      </div>

      {/* DB mode: show the original FilterBar */}
      {mode === 'db' && <FilterBar />}

      {/* ── PAGE TITLE when country selected ── */}
      {selectedCountry && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, color: 'var(--txt1)', fontSize: 18, fontWeight: 700 }}>
            {selectedState ? `${selectedState.name}, ${selectedCountry.name}` : selectedCountry.name}
          </h2>
          {!usgsLoading && usgsData && (
            <span style={{ color: 'var(--txt3)', fontSize: 13 }}>
              — {usgsData.stats.total.toLocaleString()} events via USGS
            </span>
          )}
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--txt3)', marginTop: 16, fontSize: 14 }}>
            {mode === 'usgs' ? `Fetching USGS data for ${selectedCountry?.name}…` : 'Loading…'}
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {usgsError && !usgsLoading && (
        <div style={{
          background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.3)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 16,
          color: '#ff3d3d', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong>USGS fetch failed</strong>
            <br /><span style={{ fontSize: 12, opacity: 0.8 }}>{usgsError}</span>
            <br /><button onClick={fetchCountryData}
              style={{ marginTop: 8, padding: '4px 12px', background: 'rgba(255,61,61,0.2)', border: '1px solid rgba(255,61,61,0.4)', borderRadius: 6, color: '#ff3d3d', cursor: 'pointer', fontSize: 12 }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── NO DATA ── */}
      {!loading && !usgsError && mode === 'usgs' && usgsData && usgsData.stats.total === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔇</div>
          <p>No earthquakes found for <strong>{selectedCountry?.name}</strong> in the selected time range and magnitude threshold.</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Try expanding the time range or lowering the minimum magnitude.</p>
        </div>
      )}

      {/* ── NO DATA DB ── */}
      {!loading && mode === 'db' && !dbStats && (
        <div className="empty-state"><div className="empty-icon">⚠️</div><p>No data</p></div>
      )}

      {/* ── CHARTS ── */}
      {!loading && stats && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Events"   value={stats.total?.toLocaleString()}        accent="plasma" />
            <KpiCard label="Major Events"   value={stats.major_count?.toLocaleString()}  accent="hot"    />
            <KpiCard label="Avg Magnitude"  value={`M ${stats.avg_mag}`} />
            <KpiCard label="Peak Magnitude" value={`M ${stats.max_mag}`}                 accent="warn"   />
            <KpiCard label="Avg Depth"      value={`${stats.avg_depth} km`} />
          </div>

          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header">
              <span className="panel-title">📈 Monthly Frequency</span>
              <span className="panel-badge">EVENTS PER MONTH</span>
            </div>
            <div className="panel-body">
              <SeismoAreaChart data={monthly} dataKey="count" height={240} />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <Panel title="📊 Yearly Trend" badge="ANNUAL COUNT">
              <SeismoBarChart data={yearly} dataKey="count" xKey="period"
                color="#00c8ff" height={220} />
            </Panel>
            <Panel title="🥧 Magnitude Distribution">
              <SeismoDonutChart slices={donut} height={220} />
            </Panel>
          </div>

          {/* Avg magnitude over time — only in USGS mode where we have rich data */}
          {mode === 'usgs' && monthly.length > 0 && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-header">
                <span className="panel-title">〰️ Average Magnitude Over Time</span>
                <span className="panel-badge">MONTHLY AVG</span>
              </div>
              <div className="panel-body">
                <SeismoAreaChart data={monthly} dataKey="avg_mag" height={200} color="#ff9f1c" />
              </div>
            </div>
          )}

          <Panel title="📋 Full Statistics Summary" badge="AGGREGATE DATA">
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
      )}
    </>
  )
}