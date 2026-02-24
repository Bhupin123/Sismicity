import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ───────────────────────────────────────────
api.interceptors.request.use(
  (config) => config,
  (error)  => Promise.reject(error)
)

// ── Response interceptor ──────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error)    => {
    const msg = error.response?.data?.detail || error.message || 'Network error'
    console.error('[API Error]', msg)
    return Promise.reject(new Error(msg))
  }
)

// ── Earthquake endpoints ──────────────────────────────────────────
export const earthquakeService = {
  getAll:       (params) => api.get('/api/earthquakes', { params }),
  getStats:     (params) => api.get('/api/earthquakes/stats', { params }),
  getTimeline:  (params) => api.get('/api/earthquakes/timeline', { params }),
  getByLocation:(params) => api.get('/api/earthquakes/by-location', { params }),
  getRecent:    (params) => api.get('/api/earthquakes/recent', { params }),
  getHealth:    ()       => api.get('/api/health'),
  getOne:       (id)     => api.get(`/api/earthquakes/${id}`),
}

// ── ML / AI endpoints ─────────────────────────────────────────────
export const aiService = {
  predictMagnitude: (data) => api.post('/api/ai/predict-magnitude', data),
  assessRisk:       (data) => api.post('/api/ai/assess-risk', data),
  getStatus:        ()     => api.get('/api/ai/status'),
}

// ── Forecasting endpoints ─────────────────────────────────────────
export const forecastService = {
  getForecast:  (params) => api.get('/api/forecast', { params }),
  getHotspots:  (params) => api.get('/api/forecast/hotspots', { params }),
  getProximity: (data)   => api.post('/api/forecast/proximity', data),
}

// ── Chat endpoint ─────────────────────────────────────────────────
export const chatService = {
  send:      (message) => api.post('/api/chat', { message }),
  getStatus: ()        => api.get('/api/chat/status'),
}

export default api