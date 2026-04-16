import React, { useEffect, useRef, useCallback } from 'react'

const MAG_COLORS = [
  { min: 7,   color: '#b06aff', label: '>= M7'   },
  { min: 5.5, color: '#ff3d3d', label: 'M5.5-7'  },
  { min: 4,   color: '#ff9f1c', label: 'M4-5.5'  },
  { min: 0,   color: '#00c8ff', label: '< M4'    },
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

export default function EarthquakeMap({ events = [], height = 420 }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const mapInstance  = useRef(null)
  const markersRef   = useRef([])
  const tileRef      = useRef(null)

  // ── Init map once ──────────────────────────────────────────────
  const initMap = useCallback(() => {
    const L = window.L
    if (!L || !mapRef.current || mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      center: [20, 85],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
      // Prevent scroll propagation out of map container
      scrollWheelZoom: true,
    })

    tileRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://leafletjs.com">Leaflet</a> | &copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(mapInstance.current)
  }, [])

  useEffect(() => {
    // Small delay to ensure the container is painted
    const t = setTimeout(initMap, 80)
    return () => {
      clearTimeout(t)
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [initMap])

  // ── Invalidate size when height prop changes ───────────────────
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 60)
    }
  }, [height])

  // ── ResizeObserver so map always fills its container ──────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      mapInstance.current?.invalidateSize()
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Plot markers whenever events change ───────────────────────
  useEffect(() => {
    const L   = window.L
    const map = mapInstance.current
    if (!L || !map) return

    // Clear previous markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!events.length) return

    events.slice(0, 1500).forEach(eq => {
      if (eq.lat == null || eq.lon == null) return

      const col    = magColor(eq.mag ?? 0)
      const radius = magRadius(eq.mag ?? 0)

      const circle = L.circleMarker([eq.lat, eq.lon], {
        radius,
        fillColor:   col,
        color:       col,
        fillOpacity: 0.65,
        weight:      1,
        opacity:     0.9,
      }).addTo(map)

      circle.bindPopup(
        `<div style="font-family:'Space Grotesk',sans-serif;min-width:180px;padding:2px 0">
          <div style="font-size:17px;font-weight:700;color:${col};margin-bottom:2px">
            M ${Number(eq.mag ?? 0).toFixed(1)}
          </div>
          <div style="font-size:12px;color:#8aaac8;margin-bottom:6px;line-height:1.4">
            ${eq.place || 'Unknown location'}
          </div>
          <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;font-size:11px;color:#5a7a99;line-height:1.6">
            <span>Depth: ${Number(eq.depth ?? 0).toFixed(0)} km</span><br/>
            ${eq.dt ? `<span>${String(eq.dt).slice(0, 16).replace('T', ' ')}</span>` : ''}
          </div>
        </div>`,
        { className: 'seismo-popup' }
      )

      markersRef.current.push(circle)
    })
  }, [events])

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',   // hard clip — nothing bleeds outside
        position: 'relative',
        isolation: 'isolate', // new stacking context keeps z-index contained
        background: '#0a1220',
      }}
    >
      {/* Leaflet mounts here */}
      <div
        ref={mapRef}
        style={{
          position: 'absolute',
          inset: 0,           // fills container exactly
          zIndex: 0,
        }}
      />

      {/* Legend — sits above the map tile layer */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 800,          // below Leaflet controls (1000) but above tiles
        background: 'rgba(6, 12, 22, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,200,255,0.12)',
        borderRadius: 8,
        padding: '7px 12px',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        pointerEvents: 'none',
      }}>
        {MAG_COLORS.slice().reverse().map(({ color, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#7a9ab8', fontWeight: 600,
            letterSpacing: '0.3px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: color,
              boxShadow: `0 0 4px ${color}80`,
            }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}