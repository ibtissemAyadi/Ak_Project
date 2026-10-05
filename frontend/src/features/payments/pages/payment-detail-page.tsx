import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BellRing, CreditCard } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAsync } from '@/hooks/use-async'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { ApiHttpError } from '@/lib/api-http'
import { paymentsService } from '@/services/payments-service'
import { estEnRetard, ouvrirRelanceGmail } from '@/features/payments/components/payment-columns'
import { FACTURE_STATUT_META, MODE_REGLEMENT_LABELS } from '@/lib/constants'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import type { FactureStatut } from '@/types'

export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const user = useAuthStore((s) => s.user)
  const canChangeStatus = hasPermission(user, 'paiements', 'modification')
  const [statusBusy, setStatusBusy] = useState(false)
  const { data: payment, isLoading, error, refetch } = useAsync(() => paymentsService.getById(paymentId!), [paymentId])
  const { data: timeline, isLoading: timelineLoading } = useAsync(
    () => (payment ? paymentsService.getTimeline(payment.invoiceReference) : Promise.resolve([])),
    [payment?.invoiceReference],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !payment) return <ErrorState onRetry={refetch} description="Impossible de charger ce paiement." />

  const changerStatut = async (statut: FactureStatut) => {
    if (statut === payment.status) return
    setStatusBusy(true)
    try {
      await paymentsService.updateStatus(payment.id, statut)
      toast.success(`Statut mis à jour : ${FACTURE_STATUT_META[statut]?.label ?? statut}.`)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de mettre à jour le statut.')
    } finally {
      setStatusBusy(false)
    }
  }

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
            {canChangeStatus ? (
              <Select value={payment.status} onValueChange={(v) => changerStatut(v as FactureStatut)} disabled={statusBusy}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FACTURE_STATUT_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <StatusBadge status={payment.status} meta={FACTURE_STATUT_META} />
            )}
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
