import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => config,
  (error)  => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error)    => {
    const msg = error.response?.data?.detail || error.message || 'Network error'
    console.error('[API Error]', msg)
    return Promise.reject(new Error(msg))
  }
)

export const earthquakeService = {
  getAll:        (params) => api.get('/api/earthquakes', { params }),
  getStats:      (params) => api.get('/api/earthquakes/stats', { params }),
  getTimeline:   (params) => api.get('/api/earthquakes/timeline', { params }),
  getByLocation: (params) => api.get('/api/earthquakes/by-location', { params }),
  getRecent:     (params) => api.get('/api/earthquakes/recent', { params }),
  getHealth:     ()       => api.get('/api/health'),
  getOne:        (id)     => api.get('/api/earthquakes/' + id),
}

export const aiService = {
  predictMagnitude: (data) => api.post('/api/ai/predict-magnitude', data),
  assessRisk:       (data) => api.post('/api/ai/assess-risk', data),
  getStatus:        ()     => api.get('/api/ai/status'),
}

export const forecastService = {
  getForecast:  (params) => api.get('/api/forecast', { params }),
  getHotspots:  (params) => api.get('/api/forecast/hotspots', { params }),
  getProximity: (data)   => api.post('/api/forecast/proximity', data),
}

export const chatService = {
  send:      (message, history = []) => api.post('/api/chat', { message, history }),
  getStatus: ()                      => api.get('/api/chat/status'),
}

export const usgsService = {
  fetchLive: (params) => api.post('/api/earthquakes/fetch-usgs', null, { params }),
}

export default api
