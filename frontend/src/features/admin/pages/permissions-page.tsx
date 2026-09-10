import { Check, X } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAsync } from '@/hooks/use-async'
import { adminRolesService } from '@/services/admin-api'
import { PERMISSION_ACTION_LABELS, PERMISSION_ACTIONS, PERMISSION_MODULE_LABELS, PERMISSION_MODULES } from '@/lib/constants'

export function PermissionsPage() {
  const { data: roles, isLoading, error, refetch } = useAsync(() => adminRolesService.list(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matrice des permissions"
        description="Ce que chaque rôle peut consulter, créer, modifier, supprimer ou valider par module — tel que stocké en base de données."
      />

      {isLoading ? (
        <CardGridSkeleton count={1} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <Tabs defaultValue={roles?.[0]?.id}>
          <TabsList className="flex-wrap h-auto">
            {(roles ?? []).map((role) => (
              <TabsTrigger key={role.id} value={role.id}>
                {role.libelle}
              </TabsTrigger>
            ))}
          </TabsList>

          {(roles ?? []).map((role) => (
            <TabsContent key={role.id} value={role.id}>
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Module
                        </th>
                        {PERMISSION_ACTIONS.map((action) => (
                          <th
                            key={action}
                            className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {PERMISSION_ACTION_LABELS[action]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.map((moduleName) => (
                        <tr key={moduleName} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {PERMISSION_MODULE_LABELS[moduleName]}
                          </td>
                          {PERMISSION_ACTIONS.map((action) => {
                            const granted = Boolean(role.permissions[moduleName]?.[action])
                            return (
                              <td key={action} className="px-4 py-3 text-center">
                                {granted ? (
                                  <Check className="mx-auto h-4 w-4 text-success" />
                                ) : (
                                  <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
