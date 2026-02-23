import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // ── Filters ───────────────────────────────────────────────────
  filters: {
    days:   null,
    minMag: null,
    maxMag: null,
    depth:  null,
  },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () =>
    set({ filters: { days: null, minMag: null, maxMag: null, depth: null } }),

  // ── System health ─────────────────────────────────────────────
  health: null,
  setHealth: (health) => set({ health }),

  // ── Notification ──────────────────────────────────────────────
  notification: null,
  setNotification: (msg) => {
    set({ notification: msg })
    setTimeout(() => set({ notification: null }), 4000)
  },

  // ── WebSocket ─────────────────────────────────────────────────
  wsConnected:  false,
  setWsConnected: (v) => set({ wsConnected: v }),
  latestEvent:  null,
  setLatestEvent: (e) => set({ latestEvent: e }),
}))
