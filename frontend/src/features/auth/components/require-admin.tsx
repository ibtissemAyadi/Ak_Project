import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth-store'

// Frontend-side convenience guard for the Administration section — the real
// enforcement is server-side (HasModulePermission on 'utilisateurs'), this
// just avoids showing/letting a non-admin navigate into a section every
// call to which would 403 anyway.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (user?.role.libelle !== 'Administrateur') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
