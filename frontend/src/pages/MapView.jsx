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
  { id: 'dark',      label: 'Dark',      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                                      attr: '&copy; OpenStreetMap &copy; CARTO', sub: 'abcd' },
  { id: 'satellite', label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                      attr: '&copy; Esri',                       sub: null   },
  { id: 'terrain',   label: 'Terrain',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                                   attr: '&copy; OpenTopoMap',                sub: 'abc'  },
  { id: 'street',    label: 'Street',    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',                                           attr: '&copy; OpenStreetMap &copy; CARTO', sub: 'abcd' },
  { id: 'night',     label: 'Night',     url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg', attr: '&copy; NASA',                       sub: null   },
]

// ── Magnitude config ──────────────────────────────────────────────
const MAG_CONFIG = [
  { min: 7,   color: '#b06aff', label: 'M7+',    cat: 'GREAT'    },
  { min: 5.5, color: '#ff3d3d', label: 'M5.5-7', cat: 'MAJOR'    },
  { min: 4,   color: '#ff9f1c', label: 'M4-5.5', cat: 'MODERATE' },
  { min: 0,   color: '#00c8ff', label: 'M < 4',  cat: 'MINOR'    },
]
const magColor  = m => (MAG_CONFIG.find(c => m >= c.min) || MAG_CONFIG[3]).color
const magCat    = m => (MAG_CONFIG.find(c => m >= c.min) || MAG_CONFIG[3]).cat
const magRadius = m => Math.max(5, Math.min(24, (m - 1.5) * 3.8))

function getCoords(eq) {
  if (eq.lat != null && eq.lon != null) return [+eq.lat, +eq.lon]
  return [null, null]
}

// ── Accurate country extraction ───────────────────────────────────
// Maps USGS sub-region names → canonical country names
const REGION_MAP = {
  // China provinces & autonomous regions
  xinjiang: 'China', xizang: 'China', tibet: 'China', qinghai: 'China',
  sichuan: 'China', yunnan: 'China', gansu: 'China', shaanxi: 'China',
  shanxi: 'China', hebei: 'China', liaoning: 'China', jilin: 'China',
  heilongjiang: 'China', 'inner mongolia': 'China', ningxia: 'China',
  guizhou: 'China', guangxi: 'China', fujian: 'China', hunan: 'China',
  hubei: 'China', henan: 'China', anhui: 'China', jiangxi: 'China',
  zhejiang: 'China', jiangsu: 'China', shandong: 'China',

  // Japan regions
  honshu: 'Japan', kyushu: 'Japan', hokkaido: 'Japan', shikoku: 'Japan',
  'ryukyu islands': 'Japan', 'bonin islands': 'Japan',

  // Indonesia regions
  sumatra: 'Indonesia', java: 'Indonesia', sulawesi: 'Indonesia',
  'irian jaya': 'Indonesia', 'flores region': 'Indonesia',
  'banda sea': 'Indonesia', 'molucca sea': 'Indonesia',
  seram: 'Indonesia', halmahera: 'Indonesia', papua: 'Indonesia',
  kalimantan: 'Indonesia', lombok: 'Indonesia', 'timor region': 'Indonesia',
  nias: 'Indonesia', bali: 'Indonesia', 'kepulauan barat daya': 'Indonesia',
  'kepulauan sula': 'Indonesia', 'ceram sea': 'Indonesia',

  // Philippines
  mindanao: 'Philippines', luzon: 'Philippines', visayas: 'Philippines',
  'philippine islands': 'Philippines', samar: 'Philippines',
  leyte: 'Philippines', negros: 'Philippines',

  // Russia regions
  kamchatka: 'Russia', sakhalin: 'Russia', 'kuril islands': 'Russia',
  siberia: 'Russia', yakutia: 'Russia', 'near islands': 'Russia',
  'fox islands': 'United States',

  // US states
  alaska: 'United States', hawaii: 'United States', california: 'United States',
  nevada: 'United States', oregon: 'United States', washington: 'United States',
  montana: 'United States', idaho: 'United States', wyoming: 'United States',
  utah: 'United States', colorado: 'United States', arizona: 'United States',
  'new mexico': 'United States', texas: 'United States', oklahoma: 'United States',
  'puerto rico': 'United States', guam: 'United States',
  'u.s. virgin islands': 'United States',

  // Pacific nations
  'kermadec islands': 'New Zealand', 'north island': 'New Zealand',
  'south island': 'New Zealand',
  'loyalty islands': 'France', 'new caledonia': 'France',
  'wallis and futuna': 'France', 'french polynesia': 'France',
  azores: 'Portugal', 'canary islands': 'Spain', madeira: 'Portugal',
  svalbard: 'Norway',
  'south sandwich islands': 'United Kingdom',
  'south georgia island region': 'United Kingdom',
  'falkland islands': 'United Kingdom',
  'kerguelen islands': 'France',

  // Oceanic ridges
  'mid-indian ridge': 'Indian Ocean Ridge',
  'mid-atlantic ridge': 'Atlantic Ocean Ridge',
  'east pacific rise': 'Pacific Ocean Ridge',
  'carlsberg ridge': 'Indian Ocean Ridge',
  'southwest indian ridge': 'Indian Ocean Ridge',
  'central mid-atlantic ridge': 'Atlantic Ocean Ridge',
}

// Keywords to scan the full place string when comma-parsing fails
const KEYWORD_COUNTRY = [
  // Order matters — more specific first
  ['puerto rico',    'United States'],
  ['u.s. virgin',    'United States'],
  ['xinjiang',       'China'],
  ['xizang',         'China'],
  ['qinghai',        'China'],
  ['sichuan',        'China'],
  ['yunnan',         'China'],
  ['tibet',          'China'],
  ['ryukyu',         'Japan'],
  ['honshu',         'Japan'],
  ['hokkaido',       'Japan'],
  ['kyushu',         'Japan'],
  ['shikoku',        'Japan'],
  ['kuril',          'Russia'],
  ['kamchatka',      'Russia'],
  ['sakhalin',       'Russia'],
  ['sumatra',        'Indonesia'],
  ['java',           'Indonesia'],
  ['sulawesi',       'Indonesia'],
  ['halmahera',      'Indonesia'],
  ['mindanao',       'Philippines'],
  ['luzon',          'Philippines'],
  ['visayas',        'Philippines'],
  ['kermadec',       'New Zealand'],
  ['new britain',    'Papua New Guinea'],
  ['new ireland',    'Papua New Guinea'],
  ['new guinea',     'Papua New Guinea'],
  ['solomon',        'Solomon Islands'],
  ['svalbard',       'Norway'],
  ['azores',         'Portugal'],
  ['alaska',         'United States'],
  ['hawaii',         'United States'],
  ['california',     'United States'],
  ['nevada',         'United States'],
  ['oregon',         'United States'],
  ['washington',     'United States'],
  ['fiji',           'Fiji'],
  ['tonga',          'Tonga'],
  ['vanuatu',        'Vanuatu'],
  ['samoa',          'Samoa'],
  ['chile',          'Chile'],
  ['peru',           'Peru'],
  ['bolivia',        'Bolivia'],
  ['ecuador',        'Ecuador'],
  ['colombia',       'Colombia'],
  ['venezuela',      'Venezuela'],
  ['mexico',         'Mexico'],
  ['nicaragua',      'Nicaragua'],
  ['costa rica',     'Costa Rica'],
  ['el salvador',    'El Salvador'],
  ['guatemala',      'Guatemala'],
  ['honduras',       'Honduras'],
  ['panama',         'Panama'],
  ['cuba',           'Cuba'],
  ['haiti',          'Haiti'],
  ['dominican',      'Dominican Republic'],
  ['afghanistan',    'Afghanistan'],
  ['pakistan',       'Pakistan'],
  ['india',          'India'],
  ['nepal',          'Nepal'],
  ['myanmar',        'Myanmar'],
  ['iran',           'Iran'],
  ['iraq',           'Iraq'],
  ['turkey',         'Turkey'],
  ['greece',         'Greece'],
  ['italy',          'Italy'],
  ['romania',        'Romania'],
  ['taiwan',         'Taiwan'],
  ['new zealand',    'New Zealand'],
  ['indonesia',      'Indonesia'],
  ['philippines',    'Philippines'],
  ['japan',          'Japan'],
  ['china',          'China'],
  ['russia',         'Russia'],
  ['australia',      'Australia'],
  ['morocco',        'Morocco'],
  ['algeria',        'Algeria'],
  ['kenya',          'Kenya'],
  ['tanzania',       'Tanzania'],
  ['ethiopia',       'Ethiopia'],
]

// Words that indicate the last segment is NOT a country name
const NON_COUNTRY_WORDS = new Set([
  'of', 'near', 'the', 'coast', 'region', 'area', 'ridge', 'rise',
  'sea', 'ocean', 'islands', 'island', 'south', 'north', 'east', 'west',
  'central', 'eastern', 'western', 'northern', 'southern', 'offshore',
  'border', 'off', 'between',
])

function extractCountry(place) {
  if (!place) return 'Unknown'
  const lower = place.toLowerCase()

  // Step 1 — try last comma segment
  const parts   = place.split(',').map(p => p.trim())
  const lastRaw = parts[parts.length - 1]
  const lastLow = lastRaw.toLowerCase()

  // Direct map hit
  if (REGION_MAP[lastLow]) return REGION_MAP[lastLow]

  // Clean country name: no stop words, and there's more than one segment
  if (parts.length > 1) {
    const words = new Set(lastLow.split(/\s+/))
    const hasStopWord = [...words].some(w => NON_COUNTRY_WORDS.has(w))
    if (!hasStopWord && lastRaw.length > 1) return lastRaw
  }

  // Step 2 — scan all comma segments against REGION_MAP
  for (const part of parts) {
    const p = part.trim().toLowerCase()
    if (REGION_MAP[p]) return REGION_MAP[p]
    // also try without leading directional prefix e.g. "western Sichuan" → "sichuan"
    const words = p.split(/\s+/)
    const last  = words[words.length - 1]
    if (REGION_MAP[last]) return REGION_MAP[last]
  }

  // Step 3 — keyword scan of full string (ordered, most specific first)
  for (const [kw, country] of KEYWORD_COUNTRY) {
    if (lower.includes(kw)) return country
  }

  // Step 4 — fallback to last segment
  return lastRaw || 'Unknown'
}

// ── Filter options ────────────────────────────────────────────────
const TIME_OPTS = [
  { label: 'All Time', days: null },
  { label: '10 Years', days: 3650 },
  { label: '5 Years',  days: 1825 },
  { label: '1 Year',   days: 365  },
  { label: '6 Months', days: 180  },
  { label: '30 Days',  days: 30   },
  { label: '7 Days',   days: 7    },
  { label: '24 Hours', days: 1    },
]
const MAG_OPTS = [
  { label: 'All',   min: null, max: null },
  { label: 'M2+',   min: 2,    max: null },
  { label: 'M3+',   min: 3,    max: null },
  { label: 'M4+',   min: 4,    max: null },
  { label: 'M5+',   min: 5,    max: null },
  { label: 'M5.5+', min: 5.5,  max: null },
  { label: 'M6+',   min: 6,    max: null },
  { label: 'M7+',   min: 7,    max: null },
]
const DEPTH_OPTS = [
  { label: 'All Depths',       min: null, max: null },
  { label: 'Shallow < 70 km',  min: 0,    max: 70   },
  { label: 'Medium 70-300 km', min: 70,   max: 300  },
  { label: 'Deep > 300 km',    min: 300,  max: null },
]

// ── Shared styles ─────────────────────────────────────────────────
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
  divider: { height: 1, background: 'var(--border)', margin: '4px 0' },
  countryTag: (active) => ({
    padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
    background: active ? 'rgba(0,200,255,0.18)' : 'rgba(0,200,255,0.06)',
    border: active ? '1px solid var(--plasma)' : '1px solid rgba(0,200,255,0.15)',
    color: 'var(--plasma)', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'var(--font)', transition: 'all 0.15s',
  }),
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
      const mag     = +(eq.mag || 0)
      const col     = magColor(mag)
      const depth   = +(eq.depth || 0)
      const time    = eq.dt ? String(eq.dt).slice(0, 16).replace('T', ' ') : ''
      const country = extractCountry(eq.place)

      const m = L.circleMarker([lat, lon], {
        radius: magRadius(mag), fillColor: col, color: col,
        fillOpacity: 0.72, weight: 1.2, opacity: 1,
      }).addTo(map)

      m.bindPopup(`
        <div style="font-family:'Space Grotesk',sans-serif;min-width:200px;padding:4px 0">
          <div style="font-size:20px;font-weight:800;color:${col};margin-bottom:2px;font-family:'Bebas Neue',sans-serif;letter-spacing:1px">
            M ${mag.toFixed(1)}
            <span style="font-size:11px;font-weight:600;background:${col}22;padding:2px 8px;border-radius:10px;border:1px solid ${col}44">${magCat(mag)}</span>
          </div>
          <div style="font-size:12px;color:#8aaac8;margin-bottom:2px;line-height:1.5">${eq.place || 'Unknown location'}</div>
          <div style="font-size:11px;color:#00c8ff;margin-bottom:10px;font-weight:600;">${country}</div>
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
        attribution: style.attr, maxZoom: 19, subdomains: style.sub || 'abc',
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

  useEffect(() => {
    const L   = window.L
    const map = mapInst.current
    if (!L || !map || !readyRef.current) return
    const style = MAP_STYLES.find(x => x.id === styleId) || MAP_STYLES[0]
    if (tileInst.current) map.removeLayer(tileInst.current)
    tileInst.current = L.tileLayer(style.url, {
      attribution: style.attr, maxZoom: 19, subdomains: style.sub || 'abc',
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

      {/* Map style switcher */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 800, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {MAP_STYLES.map(ms => (
          <button key={ms.id}
            onClick={() => {
              const L = window.L; const map = mapInst.current
              if (!L || !map) return
              const style = MAP_STYLES.find(x => x.id === ms.id)
              if (tileInst.current) map.removeLayer(tileInst.current)
              tileInst.current = L.tileLayer(style.url, {
                attribution: style.attr, maxZoom: 19, subdomains: style.sub || 'abc',
              }).addTo(map)
            }}
            style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
              background: styleId === ms.id ? 'rgba(0,200,255,0.3)' : 'rgba(6,12,22,0.85)',
              border: styleId === ms.id ? '1px solid var(--plasma)' : '1px solid rgba(0,200,255,0.2)',
              color: styleId === ms.id ? 'var(--plasma)' : '#7a9ab8',
              backdropFilter: 'blur(6px)', fontFamily: 'var(--font)',
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
        padding: '8px 14px', display: 'flex', gap: 14, flexWrap: 'wrap', pointerEvents: 'none',
      }}>
        {MAG_CONFIG.slice().reverse().map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7a9ab8', fontWeight: 600, fontFamily: 'var(--font)' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}80` }} />
            {label}
          </div>
        ))}
      </div>

      {/* Event count */}
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

  const [timeIdx,         setTimeIdx]         = useState(0)
  const [magIdx,          setMagIdx]          = useState(0)
  const [depthIdx,        setDepthIdx]        = useState(0)
  const [majorOnly,       setMajorOnly]       = useState(false)
  const [mapStyleId,      setMapStyleId]      = useState('dark')
  const [showFilters,     setShowFilters]     = useState(true)
  const [sortBy,          setSortBy]          = useState('time_desc')
  // Load all events by default — backend now supports up to 200000
  const [limit,           setLimit]           = useState(200000)

  const [selectedCountry, setSelectedCountry] = useState('')
  const [typedCountry,    setTypedCountry]    = useState('')
  const [searchText,      setSearchText]      = useState('')

  const [allEvents,  setAllEvents]  = useState([])
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 50

  const timeOpt = TIME_OPTS[timeIdx]
  const magOpt  = MAG_OPTS[magIdx]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit }
      if (timeOpt.days) params.days_back = timeOpt.days
      if (magOpt.min)   params.min_mag   = magOpt.min
      if (magOpt.max)   params.max_mag   = magOpt.max
      if (majorOnly)    params.is_major  = true

      const [evtRes, statRes] = await Promise.all([
        earthquakeService.getAll(params),
        earthquakeService.getStats(timeOpt.days ? { days_back: timeOpt.days } : {}),
      ])
      setAllEvents(evtRes?.results || [])
      setStats(statRes)
      setLastUpdate(new Date())
      setPage(1)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [timeIdx, magIdx, depthIdx, limit, majorOnly])

  useEffect(() => { fetchData() }, [fetchData])

  // Build country list using accurate extractor
  const countryList = useMemo(() => {
    const counts = {}
    allEvents.forEach(e => {
      const c = extractCountry(e.place)
      if (c && c !== 'Unknown') counts[c] = (counts[c] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [allEvents])

  const activeCountry = selectedCountry || typedCountry.trim()

  // Client-side filtering
  const events = useMemo(() => {
    let data = [...allEvents]

    const dOpt = DEPTH_OPTS[depthIdx]
    if (dOpt.min !== null) data = data.filter(e => (e.depth ?? 0) >= dOpt.min)
    if (dOpt.max !== null) data = data.filter(e => (e.depth ?? 0) <= dOpt.max)

    if (activeCountry) {
      const cq = activeCountry.toLowerCase()
      // Use accurate extractor for filtering too
      data = data.filter(e => extractCountry(e.place).toLowerCase().includes(cq))
    }

    const q = searchText.trim().toLowerCase()
    if (q) data = data.filter(e => (e.place || '').toLowerCase().includes(q))

    switch (sortBy) {
      case 'time_desc':  data.sort((a, b) => new Date(b.dt) - new Date(a.dt)); break
      case 'time_asc':   data.sort((a, b) => new Date(a.dt) - new Date(b.dt)); break
      case 'mag_desc':   data.sort((a, b) => b.mag - a.mag); break
      case 'mag_asc':    data.sort((a, b) => a.mag - b.mag); break
      case 'depth_desc': data.sort((a, b) => b.depth - a.depth); break
    }
    return data
  }, [allEvents, depthIdx, activeCountry, searchText, sortBy])

  const locations = useMemo(() => {
    const counts = {}
    events.forEach(e => {
      if (!e.place) return
      const short = e.place.split(',').pop()?.trim() || e.place
      if (!counts[short]) counts[short] = { place: short, count: 0, max_mag: 0, total: 0 }
      counts[short].count++
      counts[short].max_mag = Math.max(counts[short].max_mag, e.mag)
      counts[short].total  += e.mag
    })
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(l => ({ ...l, avg_mag: +(l.total / l.count).toFixed(2) }))
  }, [events])

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

  const filterByCountry = (country) => {
    setSelectedCountry(country)
    setTypedCountry('')
    setPage(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearCountry = () => { setSelectedCountry(''); setTypedCountry(''); setPage(1) }

  const clearAll = () => {
    setSelectedCountry(''); setTypedCountry(''); setSearchText('')
    setTimeIdx(0); setMagIdx(0); setDepthIdx(0); setMajorOnly(false); setPage(1)
  }

  const hasAnyFilter = activeCountry || searchText || timeIdx > 0 || magIdx > 0 || depthIdx > 0 || majorOnly

  const maxMag     = events.length ? Math.max(...events.map(e => e.mag)).toFixed(1) : '—'
  const avgMag     = events.length ? (events.reduce((acc, e) => acc + e.mag, 0) / events.length).toFixed(2) : '—'
  const majorCount = events.filter(e => e.mag >= 5.5).length
  const greatCount = events.filter(e => e.mag >= 7).length
  const shallowPct = events.length ? Math.round(events.filter(e => (e.depth || 0) < 70).length / events.length * 100) : 0

  const totalPages  = Math.ceil(events.length / PAGE_SIZE)
  const tableEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filter panel ─────────────────────────────────────── */}
      <div className="panel">
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
            {hasAnyFilter && (
              <button onClick={clearAll} style={{
                ...s.pill(false), background: 'rgba(255,61,61,0.1)',
                border: '1px solid rgba(255,61,61,0.3)', color: 'var(--hot)',
              }}>
                Clear All
              </button>
            )}
            <button onClick={() => setShowFilters(p => !p)} style={s.pill(false)}>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Country — Dropdown</span>
                <select
                  value={selectedCountry}
                  onChange={e => { setSelectedCountry(e.target.value); setTypedCountry(''); setPage(1) }}
                  style={{ ...s.select, minWidth: 260 }}
                >
                  <option value="">All Countries ({countryList.length})</option>
                  {countryList.map(({ name, count }) => (
                    <option key={name} value={name}>{name} — {count.toLocaleString()} events</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Country — Type</span>
                <input
                  value={typedCountry}
                  onChange={e => { setTypedCountry(e.target.value); setSelectedCountry(''); setPage(1) }}
                  placeholder="e.g. Japan, Nepal, China..."
                  style={{ ...s.input, width: 200 }}
                  onFocus={e => e.target.style.borderColor = 'var(--plasma)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--bdr2)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={s.label}>Search Location</span>
                <input
                  value={searchText}
                  onChange={e => { setSearchText(e.target.value); setPage(1) }}
                  placeholder="City, region, keyword..."
                  style={{ ...s.input, width: 220 }}
                  onFocus={e => e.target.style.borderColor = 'var(--plasma)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--bdr2)'}
                />
              </div>
            </div>

            {activeCountry && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Filtering by:</span>
                <span style={{
                  padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(0,200,255,0.12)', border: '1px solid var(--plasma)',
                  color: 'var(--plasma)',
                }}>
                  {activeCountry} — {events.length.toLocaleString()} earthquakes
                </span>
                <button onClick={clearCountry} style={{
                  ...s.pill(false), fontSize: 11, padding: '2px 10px',
                  background: 'rgba(255,61,61,0.1)',
                  border: '1px solid rgba(255,61,61,0.3)', color: 'var(--hot)',
                }}>
                  Remove
                </button>
              </div>
            )}

            <div style={s.divider} />

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

            <div style={s.divider} />

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
                  <option value={1000}>1,000 events</option>
                  <option value={5000}>5,000 events</option>
                  <option value={10000}>10,000 events</option>
                  <option value={50000}>50,000 events</option>
                  <option value={200000}>All events (200k)</option>
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

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total Events"   value={events.length.toLocaleString()} color="var(--plasma)" sub={stats ? `of ${stats.total?.toLocaleString()} in database` : ''} />
        <StatCard label="Max Magnitude"  value={`M${maxMag}`}  color="#ff3d3d" />
        <StatCard label="Avg Magnitude"  value={`M${avgMag}`}  color="#ff9f1c" />
        <StatCard label="Major (M5.5+)"  value={majorCount.toLocaleString()} color="#b06aff" sub={`${greatCount} are M7+`} />
        <StatCard label="Shallow Quakes" value={`${shallowPct}%`} color="#00c8ff" sub="depth < 70 km" />
        {stats?.date_earliest && (
          <StatCard label="Date Range" value={stats.date_earliest} color="var(--txt2)" sub={`to ${stats.date_latest}`} />
        )}
      </div>

      {/* ── Map ────────────────────────────────────────────────── */}
      <Panel title="Global Earthquake Map" badge={`${events.length.toLocaleString()} PLOTTED`}>
        {loading
          ? <div style={{ height: mapHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          : <WorldMap events={events} height={mapHeight} styleId={mapStyleId} />
        }
      </Panel>

      {/* ── Charts ─────────────────────────────────────────────── */}
      <div className="grid-2">
        <Panel title="Top Locations by Frequency" badge={activeCountry || 'GLOBAL'}>
          <SeismoBarChart data={locations} dataKey="count" xKey="place"
            color="#00c8ff" height={240} horizontal />
        </Panel>
        <Panel title="Top Locations by Max Magnitude" badge={activeCountry || 'GLOBAL'}>
          <SeismoBarChart data={locations} dataKey="max_mag" xKey="place"
            color="#ff3d3d" height={240} horizontal />
        </Panel>
      </div>

      {/* ── Event table ────────────────────────────────────────── */}
      <Panel title="Earthquake Records" badge={`${events.length.toLocaleString()} TOTAL`}>
        {loading
          ? <div className="spinner" />
          : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 750 }}>
                  <thead>
                    <tr>
                      {['#', 'Date / Time', 'Magnitude', 'Category', 'Depth (km)', 'Country', 'Location', 'Coordinates'].map(h => (
                        <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableEvents.map((e, i) => {
                      const [lat, lon] = getCoords(e)
                      const col     = magColor(e.mag)
                      const cat     = magCat(e.mag)
                      const idx     = (page - 1) * PAGE_SIZE + i + 1
                      const country = extractCountry(e.place)
                      const isActive = activeCountry && country.toLowerCase().includes(activeCountry.toLowerCase())
                      return (
                        <tr key={e.id || i}>
                          <td style={{ color: 'var(--txt3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{idx}</td>
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
                              background: `${col}20`, color: col, border: `1px solid ${col}40`, whiteSpace: 'nowrap',
                            }}>
                              {cat}
                            </span>
                          </td>
                          <td style={{ color: 'var(--txt2)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                            {(e.depth || 0).toFixed(1)}
                          </td>
                          <td>
                            <button
                              onClick={() => filterByCountry(country)}
                              title={`Filter by ${country}`}
                              style={s.countryTag(isActive)}
                            >
                              {country}
                            </button>
                          </td>
                          <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
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

              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0 0', flexWrap: 'wrap', gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--txt2)' }}>
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, events.length)} of {events.length.toLocaleString()} events
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} style={s.pill(false)}>First</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={s.pill(false)}>Prev</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                      const p = start + i
                      return p <= totalPages ? (
                        <button key={p} onClick={() => setPage(p)} style={s.pill(page === p)}>{p}</button>
                      ) : null
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={s.pill(false)}>Next</button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={s.pill(false)}>Last</button>
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