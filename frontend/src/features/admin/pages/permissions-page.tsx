import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MOCK_ROLES, PERMISSION_MODULES } from '@/mocks/data/roles'

type Level = { view: boolean; create: boolean; edit: boolean; delete: boolean }

const ACTIONS: (keyof Level)[] = ['view', 'create', 'edit', 'delete']

export function PermissionsPage() {
  const [matrices, setMatrices] = useState(() =>
    Object.fromEntries(MOCK_ROLES.map((r) => [r.name, structuredClone(r.permissions)])),
  )

  const toggle = (roleName: string, moduleName: string, action: keyof Level) => {
    setMatrices((prev) => ({
      ...prev,
      [roleName]: {
        ...prev[roleName],
        [moduleName]: {
          ...prev[roleName][moduleName],
          [action]: !prev[roleName][moduleName][action],
        },
      },
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions Matrix"
        description="Fine-tune what each role can view, create, edit or delete per module."
        actions={<Button onClick={() => toast.success('Permissions saved.')}>Save Changes</Button>}
      />

      <Tabs defaultValue={MOCK_ROLES[0]?.name}>
        <TabsList className="flex-wrap h-auto">
          {MOCK_ROLES.map((role) => (
            <TabsTrigger key={role.name} value={role.name}>
              {role.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {MOCK_ROLES.map((role) => (
          <TabsContent key={role.name} value={role.name}>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Module
                      </th>
                      {ACTIONS.map((action) => (
                        <th key={action} className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.map((moduleName) => (
                      <tr key={moduleName} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{moduleName}</td>
                        {ACTIONS.map((action) => (
                          <td key={action} className="px-4 py-3 text-center">
                            <Checkbox
                              checked={matrices[role.name][moduleName][action]}
                              onCheckedChange={() => toggle(role.name, moduleName, action)}
                              disabled={role.name === 'admin'}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
