import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AuthUser } from '@/types'
import { API_BASE_URL } from '@/lib/constants'
import { mapAuthUser } from '@/lib/map-auth-user'
import type { RawUtilisateur } from '@/lib/map-auth-user'

interface LoginResponse {
  access: string
  refresh: string
  user: RawUtilisateur
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: async (email, password) => {
        let response: Response
        try {
          response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
        } catch {
          return {
            success: false,
            error: 'Impossible de contacter le serveur. Vérifie que le backend est démarré.',
          }
        }

        const data = await response.json().catch(() => null)

        if (!response.ok || !data) {
          const error =
            (data && (data.detail || data.non_field_errors?.[0])) ??
            'Email ou mot de passe incorrect.'
          return { success: false, error }
        }

        const loginData = data as LoginResponse
        set({
          user: mapAuthUser(loginData.user),
          accessToken: loginData.access,
          refreshToken: loginData.refresh,
          isAuthenticated: true,
        })
        return { success: true }
      },
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'ak-auth' },
  ),
)
