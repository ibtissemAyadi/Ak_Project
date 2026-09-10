import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, MessageSquare, Plus, X } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAsync } from '@/hooks/use-async'
import { paymentsService } from '@/services/payments-service'
import { formatDate } from '@/lib/formatters'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  scheduled: 'warning',
  sent: 'success',
  cancelled: 'muted',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifiée',
  sent: 'Envoyée',
  cancelled: 'Annulée',
}

export function PaymentRemindersPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => paymentsService.listReminders(), [])
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(true)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relances de paiement"
        description="Relances automatiques envoyées aux clients avant et après échéance."
        actions={
          <Button variant="outline" onClick={() => navigate('/payments')}>
            Retour aux paiements
          </Button>
        }
      />

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Relances automatiques</p>
            <p className="text-xs text-muted-foreground">
              Envoie automatiquement un email aux clients 7 jours avant l'échéance, puis à nouveau si la facture est en retard.
            </p>
          </div>
          <Switch checked={autoRemindersEnabled} onCheckedChange={setAutoRemindersEnabled} />
        </CardContent>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Aucune relance planifiée"
          description="Les relances sont générées automatiquement pour les factures en retard ou à venir."
          actionLabel="Nouvelle relance"
          onAction={() => toast.info('La planification manuelle de relance s\'ouvrirait ici.')}
        />
      ) : (
        <div className="space-y-3">
          {data.map((reminder) => (
            <Card key={reminder.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent-foreground">
                    {reminder.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      <Link to={`/invoices/${reminder.invoiceId}`} className="hover:underline">
                        {reminder.invoiceReference}
                      </Link>{' '}
                      · {reminder.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground">{reminder.template}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Planifiée {formatDate(reminder.scheduledFor)}</span>
                  <Badge variant={STATUS_VARIANT[reminder.status]}>{STATUS_LABELS[reminder.status] ?? reminder.status}</Badge>
                  {reminder.status === 'scheduled' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => toast.success('Relance annulée.')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" className="gap-2" onClick={() => toast.info('La planification manuelle de relance s\'ouvrirait ici.')}>
        <Plus className="h-4 w-4" />
        Planifier une relance manuelle
      </Button>
    </div>
  )
}
