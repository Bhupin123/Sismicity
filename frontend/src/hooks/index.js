import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

// ── useFetch ──────────────────────────────────────────────────────────
export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}

// ── useWebSocket ──────────────────────────────────────────────────────
export function useWebSocket() {
  const setWsConnected  = useAppStore((s) => s.setWsConnected)
  const setLatestEvent  = useAppStore((s) => s.setLatestEvent)
  const setNotification = useAppStore((s) => s.setNotification)

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    let ws
    try {
      ws = new WebSocket(`${WS_URL}/ws/live/`)

      ws.onopen = () => {
        setWsConnected(true)
        console.log('[WS] Connected')
      }
      ws.onclose = () => {
        setWsConnected(false)
        console.log('[WS] Disconnected')
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'latest_event') {
            setLatestEvent(msg.data)
            setNotification(`Live: M${msg.data.mag} at ${msg.data.place?.slice(0, 30)}`)
          }
        } catch {}
      }
      ws.onerror = () => setWsConnected(false)

      // Keep alive ping every 25s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'ping' }))
      }, 25000)

      return () => {
        clearInterval(ping)
        ws.close()
      }
    } catch (e) {
      console.warn('[WS] Not available:', e.message)
    }
  }, [])
}

// ── useFilters ────────────────────────────────────────────────────────
export function useFilters() {
  const { filters, setFilter, resetFilters } = useAppStore()
  const params = {}
  if (filters.days)   params.days_back = filters.days
  if (filters.minMag) params.min_mag   = filters.minMag
  if (filters.maxMag) params.max_mag   = filters.maxMag
  return { filters, params, setFilter, resetFilters }
}
