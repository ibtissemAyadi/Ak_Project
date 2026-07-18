import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KanbanSquare, Plus } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { quotationsService } from '@/services/quotations-service'
import { quotationColumns } from '@/features/quotations/components/quotation-columns'
import { QUOTATION_STATUS_META } from '@/lib/constants'

export function QuotationsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => quotationsService.list(), [])
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((q) => statusFilter === 'all' || q.status === statusFilter)
  }, [data, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Track and manage quotations across their lifecycle."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/quotations/kanban')}>
              <KanbanSquare className="h-4 w-4" />
              Kanban View
            </Button>
            <Button className="gap-2" onClick={() => navigate('/quotations/new')}>
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </>
        }
      />

      <DataTable
        columns={quotationColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Search quotations…"
        onRowClick={(row) => navigate(`/quotations/${row.id}`)}
        emptyTitle="No quotations yet"
        emptyDescription="Create your first quotation to get started."
        emptyActionLabel="New Quotation"
        onEmptyAction={() => navigate('/quotations/new')}
        toolbar={
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(QUOTATION_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        }
      />
    </div>
  )
}
