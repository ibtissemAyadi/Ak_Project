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

export function PaymentRemindersPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => paymentsService.listReminders(), [])
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(true)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Reminders"
        description="Automatic reminders sent to clients ahead of and after due dates."
        actions={
          <Button variant="outline" onClick={() => navigate('/payments')}>
            Back to Payments
          </Button>
        }
      />

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Automatic reminders</p>
            <p className="text-xs text-muted-foreground">
              Automatically email clients 7 days before due date, and again if an invoice becomes overdue.
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
          title="No reminders scheduled"
          description="Reminders are generated automatically for overdue or upcoming invoices."
          actionLabel="New Reminder"
          onAction={() => toast.info('Manual reminder scheduling would open here.')}
        />
      ) : (
        <div className="space-y-3">
          {data.map((reminder) => (
            <Card key={reminder.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
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
                  <span className="text-xs text-muted-foreground">Scheduled {formatDate(reminder.scheduledFor)}</span>
                  <Badge variant={STATUS_VARIANT[reminder.status]}>{reminder.status}</Badge>
                  {reminder.status === 'scheduled' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => toast.success('Reminder cancelled.')}
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

      <Button variant="outline" className="gap-2" onClick={() => toast.info('Manual reminder scheduling would open here.')}>
        <Plus className="h-4 w-4" />
        Schedule Manual Reminder
      </Button>
    </div>
  )
}
