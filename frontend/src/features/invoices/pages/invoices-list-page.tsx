import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { invoicesService } from '@/services/invoices-service'
import { invoiceColumns } from '@/features/invoices/components/invoice-columns'
import { INVOICE_STATUS_META } from '@/lib/constants'

export function InvoicesListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => invoicesService.list(), [])
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((i) => statusFilter === 'all' || i.status === statusFilter)
  }, [data, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Gérez la facturation, suivez les paiements et relancez les factures en retard."
        actions={
          <Button className="gap-2" onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Button>
        }
      />

      <DataTable
        columns={invoiceColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Rechercher une facture…"
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        emptyTitle="Aucune facture pour l'instant"
        emptyDescription="Créez votre première facture pour commencer à facturer vos clients."
        emptyActionLabel="Nouvelle facture"
        onEmptyAction={() => navigate('/invoices/new')}
        toolbar={
          <FilterSelect
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(INVOICE_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        }
      />
    </div>
  )
}
