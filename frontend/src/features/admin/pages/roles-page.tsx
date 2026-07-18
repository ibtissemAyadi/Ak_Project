import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Users } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { rolesService } from '@/services/users-service'
import { PERMISSION_MODULES } from '@/mocks/data/roles'

export function RolesPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => rolesService.list(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Predefined roles that control what each user can see and do."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/permissions')}>
            <ShieldCheck className="h-4 w-4" />
            View Permissions Matrix
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={5} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((role) => {
            const grantedModules = PERMISSION_MODULES.filter((m) => role.permissions[m]?.view)
            return (
              <Card key={role.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: role.color }}
                      >
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{role.label}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {role.userCount}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {grantedModules.map((m) => (
                      <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {m}
                      </span>
                    ))}
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
