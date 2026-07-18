import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { KanbanBoard } from '@/components/shared/kanban-board'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { quotationsService } from '@/services/quotations-service'
import { QUOTATION_STATUS_META } from '@/lib/constants'
import { computeQuotationTotal } from '@/mocks/data/quotations'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Quotation, QuotationStatus } from '@/types'

const STATUS_ORDER: QuotationStatus[] = ['draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired']

const ACCENT: Record<QuotationStatus, string> = {
  draft: 'bg-muted-foreground',
  sent: 'bg-info',
  under_review: 'bg-warning',
  accepted: 'bg-success',
  rejected: 'bg-destructive',
  expired: 'bg-secondary',
}

export function QuotationsKanbanPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => quotationsService.list(), [])
  const [localQuotations, setLocalQuotations] = useState<Quotation[] | null>(null)

  const quotations = localQuotations ?? data ?? []

  const columns = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        id: status,
        label: QUOTATION_STATUS_META[status].label,
        items: quotations.filter((q) => q.status === status),
        accentClass: ACCENT[status],
      })),
    [quotations],
  )

  const handleMove = async (itemId: string, targetColumnId: string) => {
    const status = targetColumnId as QuotationStatus
    setLocalQuotations((prev) =>
      (prev ?? data ?? []).map((q) => (q.id === itemId ? { ...q, status } : q)),
    )
    try {
      await quotationsService.updateStatus(itemId, status)
      toast.success(`Moved to ${QUOTATION_STATUS_META[status].label}`)
    } catch {
      toast.error('Could not update status. Reverting.')
      setLocalQuotations(null)
      refetch()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations Kanban"
        description="Drag quotations across columns to update their status."
        actions={
          <Button variant="outline" onClick={() => navigate('/quotations')}>
            Table View
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <KanbanBoard
          columns={columns}
          getItemId={(item) => item.id}
          onMoveItem={handleMove}
          renderCard={(q) => (
            <div className="space-y-2" onClick={() => navigate(`/quotations/${q.id}`)}>
              <p className="text-xs font-medium text-muted-foreground">{q.reference}</p>
              <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{q.title}</p>
              <p className="text-xs text-muted-foreground">{q.clientName}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-foreground">
                  {formatCurrency(computeQuotationTotal(q.lines).total, q.currency)}
                </span>
                <span className="text-[11px] text-muted-foreground">Valid {formatDate(q.validUntil)}</span>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
