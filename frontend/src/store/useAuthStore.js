import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,        // true until Firebase first responds
  initialized: false,   // flips to true after first onAuthStateChanged call
  setUser: (user) => set({ user, loading: false, initialized: true }),
  clearUser: () => set({ user: null, loading: false, initialized: true }),
}))