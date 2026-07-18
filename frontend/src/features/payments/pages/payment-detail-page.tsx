import { Link, useParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAsync } from '@/hooks/use-async'
import { paymentsService } from '@/services/payments-service'
import { PAYMENT_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDateTime } from '@/lib/formatters'

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card',
  check: 'Check',
  cash: 'Cash',
}

export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const { data: payment, isLoading, error, refetch } = useAsync(() => paymentsService.getById(paymentId!), [paymentId])
  const { data: timeline, isLoading: timelineLoading } = useAsync(
    () => (payment ? paymentsService.getTimeline(payment.invoiceId) : Promise.resolve([])),
    [payment?.invoiceId],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !payment) return <ErrorState onRetry={refetch} description="We could not load this payment." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.reference}
        description={
          <>
            Linked to{' '}
            <Link to={`/invoices/${payment.invoiceId}`} className="font-medium text-primary hover:underline">
              {payment.invoiceReference}
            </Link>
          </>
        }
        actions={<StatusBadge status={payment.status} meta={PAYMENT_STATUS_META} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(payment.amount, payment.currency)}</p>
            <p className="text-xs text-muted-foreground">via {METHOD_LABELS[payment.method]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Client</p>
            <Link to={`/crm/clients/${payment.clientId}`} className="text-sm font-medium text-primary hover:underline">
              {payment.clientName}
            </Link>
            <p className="pt-2 text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium text-foreground">{formatDateTime(payment.paidAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Related Invoice</p>
            <Link to={`/invoices/${payment.invoiceId}`} className="text-sm font-medium text-primary hover:underline">
              {payment.invoiceReference}
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <DetailSkeleton />
          ) : !timeline || timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <Timeline
              entries={timeline.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                timestamp: t.createdAt,
                tone: t.type === 'payment_received' ? 'success' : t.type === 'overdue' ? 'destructive' : 'default',
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
