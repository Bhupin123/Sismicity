import React, { useEffect, useRef, useCallback } from 'react'

const MAG_COLORS = [
  { min: 7,   color: '#b06aff', label: '>= M7'  },
  { min: 5.5, color: '#ff3d3d', label: 'M5.5-7' },
  { min: 4,   color: '#ff9f1c', label: 'M4-5.5' },
  { min: 0,   color: '#00c8ff', label: '< M4'   },
]

function magColor(m) {
  for (const { min, color } of MAG_COLORS) {
    if (m >= min) return color
  }
  return '#00c8ff'
}

function magRadius(m) {
  return Math.max(4, Math.min(20, (m - 1.5) * 3.2))
}

// Safely extract lat/lon from any common shape
function getCoords(eq) {
  if (eq.lat != null && eq.lon != null)               return [eq.lat, eq.lon]
  if (eq.latitude != null && eq.longitude != null)    return [eq.latitude, eq.longitude]
  if (eq.geometry?.coordinates)                       return [eq.geometry.coordinates[1], eq.geometry.coordinates[0]]
  if (eq.location?.lat != null)                       return [eq.location.lat, eq.location.lon]
  if (eq.location?.latitude != null)                  return [eq.location.latitude, eq.location.longitude]
  return [null, null]
}

function getMag(eq)   { return eq.mag ?? eq.magnitude ?? eq.properties?.mag ?? 0 }
function getPlace(eq) { return eq.place ?? eq.location_name ?? eq.properties?.place ?? 'Unknown location' }
function getDepth(eq) { return eq.depth ?? eq.geometry?.coordinates?.[2] ?? eq.properties?.depth ?? 0 }
function getTime(eq)  { return eq.dt ?? eq.time ?? eq.properties?.time ?? '' }

export default function EarthquakeMap({ events = [], height = 420 }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const mapInstance  = useRef(null)
  const markersRef   = useRef([])
  const eventsRef    = useRef(events)
  const readyRef     = useRef(false)

  useEffect(() => { eventsRef.current = events }, [events])

  // ── Plot markers ───────────────────────────────────────────────
  const plotMarkers = useCallback(() => {
    const L   = window.L
    const map = mapInstance.current
    if (!L || !map || !readyRef.current) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const data = eventsRef.current
    if (!data.length) return

    data.slice(0, 1500).forEach(eq => {
      const [lat, lon] = getCoords(eq)
      if (lat == null || lon == null) return

      const mag  = getMag(eq)
      const col  = magColor(mag)
      const time = getTime(eq)

      const circle = L.circleMarker([lat, lon], {
        radius:      magRadius(mag),
        fillColor:   col,
        color:       col,
        fillOpacity: 0.65,
        weight:      1,
        opacity:     0.9,
      }).addTo(map)

      circle.bindPopup(
        `<div style="font-family:'Space Grotesk',sans-serif;min-width:180px;padding:2px 0">
          <div style="font-size:17px;font-weight:700;color:${col};margin-bottom:2px">M ${Number(mag).toFixed(1)}</div>
          <div style="font-size:12px;color:#8aaac8;margin-bottom:6px;line-height:1.4">${getPlace(eq)}</div>
          <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;font-size:11px;color:#5a7a99;line-height:1.6">
            Depth: ${Number(getDepth(eq)).toFixed(0)} km<br/>
            ${time ? String(time).slice(0, 16).replace('T', ' ') : ''}
          </div>
        </div>`,
        { className: 'seismo-popup' }
      )

      markersRef.current.push(circle)
    })
  }, [])

  // ── Init Leaflet ───────────────────────────────────────────────
  useEffect(() => {
    const tryInit = () => {
      const L = window.L
      if (!L || !mapRef.current || mapInstance.current) return

      mapInstance.current = L.map(mapRef.current, {
        center: [20, 85],
        zoom: 4,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://leafletjs.com">Leaflet</a> | &copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(mapInstance.current)

      // Mark ready then immediately plot any events already loaded
      readyRef.current = true
      plotMarkers()
    }

    if (window.L) {
      tryInit()
    } else {
      const t = setTimeout(tryInit, 150)
      return () => clearTimeout(t)
    }

    return () => {
      readyRef.current = false
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [plotMarkers])

  // Re-plot when events arrive / change
  useEffect(() => {
    plotMarkers()
  }, [events, plotMarkers])

  // Invalidate size on height change
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 60)
    }
  }, [height])

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => { mapInstance.current?.invalidateSize() })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        isolation: 'isolate',
        background: '#0a1220',
      }}
    >
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 800,
        background: 'rgba(6,12,22,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,200,255,0.12)',
        borderRadius: 8, padding: '7px 12px',
        display: 'flex', gap: 12, flexWrap: 'wrap',
        pointerEvents: 'none',
      }}>
        {MAG_COLORS.slice().reverse().map(({ color, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#7a9ab8', fontWeight: 600, letterSpacing: '0.3px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: color, boxShadow: `0 0 4px ${color}80`,
            }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}