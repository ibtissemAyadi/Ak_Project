import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { paymentsService } from '@/services/payments-service'
import { paymentColumns } from '@/features/payments/components/payment-columns'
import { PAYMENT_STATUS_META } from '@/lib/constants'

export function PaymentsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => paymentsService.list(), [])
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((p) => statusFilter === 'all' || p.status === statusFilter)
  }, [data, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track incoming payments and manage automatic reminders."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => navigate('/payments/reminders')}>
            <BellRing className="h-4 w-4" />
            Reminders
          </Button>
        }
      />

      <DataTable
        columns={paymentColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Search payments…"
        onRowClick={(row) => navigate(`/payments/${row.id}`)}
        emptyTitle="No payments recorded"
        emptyDescription="Payments will appear here once invoices are paid."
        toolbar={
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        }
      />
    </div>
  )
}
