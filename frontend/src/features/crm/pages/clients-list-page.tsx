import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { clientsService } from '@/services/clients-service'
import { clientColumns } from '@/features/crm/components/client-columns'
import { CLIENT_STATUS_META } from '@/lib/constants'
import { INDUSTRIES } from '@/mocks/generators'

export function ClientsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => clientsService.list(), [])
  const [statusFilter, setStatusFilter] = useState('all')
  const [industryFilter, setIndustryFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (industryFilter !== 'all' && c.industry !== industryFilter) return false
      return true
    })
  }, [data, statusFilter, industryFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage client accounts, relationships and engagement history."
        actions={
          <Button className="gap-2" onClick={() => navigate('/crm/clients/new')}>
            <Plus className="h-4 w-4" />
            New Client
          </Button>
        }
      />

      <DataTable
        columns={clientColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Search clients by name…"
        onRowClick={(row) => navigate(`/crm/clients/${row.id}`)}
        emptyTitle="No clients yet"
        emptyDescription="Start building your CRM by adding your first client."
        emptyActionLabel="New Client"
        onEmptyAction={() => navigate('/crm/clients/new')}
        toolbar={
          <>
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={Object.entries(CLIENT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
            />
            <FilterSelect
              label="Industry"
              value={industryFilter}
              onChange={setIndustryFilter}
              options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
              className="h-9 w-[180px]"
            />
          </>
        }
      />
    </div>
  )
}
