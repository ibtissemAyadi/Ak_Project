import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'

export class ApiHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
  }
}

// Thin authenticated fetch wrapper used by every real (non-mock) service.
// Attaches the JWT access token automatically, and on 401 (expired/invalid
// token) logs the user out cleanly rather than leaving the app in a broken
// half-authenticated state.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = useAuthStore.getState()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiHttpError('Impossible de contacter le serveur. Vérifie que le backend est démarré.', 0)
  }

  if (response.status === 401) {
    useAuthStore.getState().logout()
    throw new ApiHttpError('Session expirée. Merci de vous reconnecter.', 401)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.detail ?? 'La requête a échoué.'
    throw new ApiHttpError(message, response.status)
  }

  return data as T
}
