import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'

// Frontend-side convenience guard — the real enforcement is server-side
// (HasModulePermission), this just avoids letting a user navigate into a
// form every submission of which would 403 anyway.
export function RequirePermission({
  module,
  action,
  redirectTo,
  children,
}: {
  module: string
  action: string
  redirectTo: string
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)

  if (!hasPermission(user, module, action)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
