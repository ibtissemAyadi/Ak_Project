import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      resolvedTheme: 'light',
      setMode: (mode) => {
        const resolvedTheme = resolveTheme(mode)
        applyTheme(resolvedTheme)
        set({ mode, resolvedTheme })
      },
    }),
    {
      name: 'ak-theme',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const resolvedTheme = resolveTheme(state.mode)
        applyTheme(resolvedTheme)
        state.resolvedTheme = resolvedTheme
      },
    },
  ),
)
