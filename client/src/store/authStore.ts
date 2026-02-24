import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState } from '../types'
import { authAPI, setAuthToken, removeAuthToken } from '../utils/api'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user, token) => {
        setAuthToken(token)
        set({ user, token, isAuthenticated: true })
      },

      login: async (email, password) => {
        const data = await authAPI.login(email, password)
        setAuthToken(data.token)
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        })
      },

      register: async (email, password, name) => {
        const data = await authAPI.register(email, password, name)
        setAuthToken(data.token)
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        })
      },

      logout: () => {
        removeAuthToken()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
