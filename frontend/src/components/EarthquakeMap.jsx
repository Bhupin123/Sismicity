import React, { useEffect, useRef } from 'react'

export default function EarthquakeMap({ events = [], height = 420 }) {
  const mapRef     = useRef(null)
  const mapInstance= useRef(null)
  const markersRef = useRef([])

  const magColor = (m) =>
    m >= 7   ? '#b06aff' :
    m >= 5.5 ? '#ff3d3d' :
    m >= 4   ? '#ff9f1c' : '#00c8ff'

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    // Dynamically load Leaflet (already in index.html via CDN link)
    const L = window.L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      center: [20, 85],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
    }).addTo(mapInstance.current)

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    const L   = window.L
    const map = mapInstance.current
    if (!L || !map || !events.length) return

    // Remove old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    events.slice(0, 1500).forEach((eq) => {
      if (!eq.lat || !eq.lon) return
      const r   = Math.max(4, Math.min(18, (eq.mag - 1.5) * 3))
      const col = magColor(eq.mag)

      const circle = L.circleMarker([eq.lat, eq.lon], {
        radius:      r,
        fillColor:   col,
        color:       col,
        fillOpacity: 0.7,
        weight:      1,
        opacity:     0.9,
      }).addTo(map)

      circle.bindPopup(`
        <div style="font-family:Space Grotesk,sans-serif;min-width:180px">
          <b style="color:${col};font-size:16px">M ${Number(eq.mag).toFixed(1)}</b><br/>
          <span style="color:#5a7a99;font-size:12px">${eq.place || ''}</span><br/>
          <hr style="border-color:#1e2535;margin:6px 0"/>
          <span style="font-size:11px;color:#5a7a99">
            Depth: ${Number(eq.depth || 0).toFixed(0)} km<br/>
            ${eq.dt ? eq.dt.slice(0, 16) : ''}
          </span>
        </div>
      `, { className: 'seismo-popup' })

      markersRef.current.push(circle)
    })
  }, [events])

  return (
    <div style={{ height, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12, zIndex: 1000,
        background: 'rgba(7,13,20,.85)', border: '1px solid rgba(0,200,255,.1)',
        borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 10, flexWrap: 'wrap',
      }}>
        {[['#00c8ff','< M4'],['#ff9f1c','M4–5.5'],['#ff3d3d','M5.5–7'],['#b06aff','≥ M7']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#5a7a99' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>
    </div>
  )
}