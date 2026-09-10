import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Users } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { adminRolesService } from '@/services/admin-api'
import { PERMISSION_MODULE_LABELS, PERMISSION_MODULES } from '@/lib/constants'

const ROLE_COLORS: Record<string, string> = {
  Administrateur: '#3D6C8F',
  Direction: '#5B87A8',
  "Chargé d'affaires": '#4A7691',
  Comptabilité: '#5B5B5B',
}

export function RolesPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => adminRolesService.list(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles"
        description="Les 4 rôles définis pour cet espace de travail et leurs accès."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/permissions')}>
            <ShieldCheck className="h-4 w-4" />
            Voir la matrice des permissions
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((role) => {
            const grantedModules = PERMISSION_MODULES.filter((m) => role.permissions[m]?.lecture)
            return (
              <Card key={role.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: ROLE_COLORS[role.libelle] ?? '#64748b' }}
                      >
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{role.libelle}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {role.userCount}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {grantedModules.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Aucun accès aux modules</span>
                    ) : (
                      grantedModules.map((m) => (
                        <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {PERMISSION_MODULE_LABELS[m]}
                        </span>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
