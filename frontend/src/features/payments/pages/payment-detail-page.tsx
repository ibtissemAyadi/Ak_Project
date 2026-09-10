import { Link, useParams } from 'react-router-dom'
import { BellRing, CreditCard } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAsync } from '@/hooks/use-async'
import { paymentsService } from '@/services/payments-service'
import { estEnRetard, ouvrirRelanceGmail } from '@/features/payments/components/payment-columns'
import { FACTURE_STATUT_META, MODE_REGLEMENT_LABELS } from '@/lib/constants'
import { formatCurrency, formatDateTime } from '@/lib/formatters'

export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const { data: payment, isLoading, error, refetch } = useAsync(() => paymentsService.getById(paymentId!), [paymentId])
  const { data: timeline, isLoading: timelineLoading } = useAsync(
    () => (payment ? paymentsService.getTimeline(payment.invoiceReference) : Promise.resolve([])),
    [payment?.invoiceReference],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !payment) return <ErrorState onRetry={refetch} description="Impossible de charger ce paiement." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.reference}
        description={
          <>
            Lié à{' '}
            <Link to={`/factures/${payment.invoiceId}`} className="font-medium text-accent-foreground hover:underline">
              {payment.invoiceReference}
            </Link>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {estEnRetard(payment) ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => ouvrirRelanceGmail(payment)}>
                <BellRing className="h-3.5 w-3.5" />
                Relancer
              </Button>
            ) : null}
            <StatusBadge status={payment.status} meta={FACTURE_STATUT_META} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
              <CreditCard className="h-5 w-5" />
            </div>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(payment.amount, payment.currency)}</p>
            <p className="text-xs text-muted-foreground">via {MODE_REGLEMENT_LABELS[payment.method]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Client</p>
            <Link to={`/crm/clients/${payment.clientId}`} className="text-sm font-medium text-accent-foreground hover:underline">
              {payment.clientName}
            </Link>
            <p className="pt-2 text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium text-foreground">{formatDateTime(payment.paidAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Facture liée</p>
            <Link to={`/factures/${payment.invoiceId}`} className="text-sm font-medium text-accent-foreground hover:underline">
              {payment.invoiceReference}
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chronologie du paiement</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <DetailSkeleton />
          ) : !timeline || timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée pour l'instant.</p>
          ) : (
            <Timeline
              entries={timeline.map((t) => ({
                id: t.id,
                title: `${t.action} ${t.target}`,
                description: t.actorName,
                timestamp: t.createdAt,
                tone: t.action.includes('Payee') ? 'success' : 'default',
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
