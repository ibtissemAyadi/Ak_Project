import type { AuthUser } from '@/types'

// Frontend-side convenience check — mirrors HasModulePermission server-side.
// Only used to show/hide UI (buttons, routes); the real enforcement is the
// 403 the API returns regardless of what this function says.
export function hasPermission(user: AuthUser | null, module: string, action: string): boolean {
  return Boolean(user?.role.permissions[module]?.[action])
}
