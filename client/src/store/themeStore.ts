import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  dark: boolean
  toggle: () => void
  setDark: (v: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () =>
        set((state) => {
          const next = !state.dark
          document.documentElement.classList.toggle('dark', next)
          return { dark: next }
        }),
      setDark: (v) => {
        document.documentElement.classList.toggle('dark', v)
        set({ dark: v })
      },
    }),
    { name: 'theme-storage' },
  ),
)

// initialise class on load (called once in main.tsx)
export function initTheme() {
  const stored = localStorage.getItem('theme-storage')
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { dark?: boolean } }
      if (parsed.state?.dark) {
        document.documentElement.classList.add('dark')
      }
    } catch {
      /* noop */
    }
  }
}
