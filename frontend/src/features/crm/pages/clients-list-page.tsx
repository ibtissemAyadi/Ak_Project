import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { clientsService } from '@/services/clients-service'
import { clientColumns } from '@/features/crm/components/client-columns'
import { CLIENT_STATUS_META } from '@/lib/constants'

export function ClientsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canCreate = hasPermission(user, 'clients', 'creation')
  const { data, isLoading, error, refetch } = useAsync(() => clientsService.list(), [])
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((c) => {
      if (statusFilter !== 'all' && c.statut !== statusFilter) return false
      return true
    })
  }, [data, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Gérez les comptes clients, les relations et l'historique des échanges."
        actions={
          canCreate ? (
            <Button className="gap-2" onClick={() => navigate('/crm/clients/new')}>
              <Plus className="h-4 w-4" />
              Nouveau client
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={clientColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Rechercher un client par nom…"
        onRowClick={(row) => navigate(`/crm/clients/${row.id}`)}
        emptyTitle="Aucun client pour l'instant"
        emptyDescription="Commencez à construire votre CRM en ajoutant votre premier client."
        emptyActionLabel={canCreate ? 'Nouveau client' : undefined}
        onEmptyAction={canCreate ? () => navigate('/crm/clients/new') : undefined}
        toolbar={
          <FilterSelect
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(CLIENT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        }
      />
    </div>
  )
}
