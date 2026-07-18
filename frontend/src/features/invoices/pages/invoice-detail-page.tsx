import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/use-async'
import { invoicesService } from '@/services/invoices-service'
import { paymentsService } from '@/services/payments-service'
import { computeInvoiceTotal } from '@/mocks/data/invoices'
import { INVOICE_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const { data: invoice, isLoading, error, refetch } = useAsync(() => invoicesService.getById(invoiceId!), [invoiceId])
  const { data: timeline, isLoading: timelineLoading } = useAsync(
    () => paymentsService.getTimeline(invoiceId!),
    [invoiceId],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !invoice) return <ErrorState onRetry={refetch} description="We could not load this invoice." />

  const totals = computeInvoiceTotal(invoice.lines)
  const remaining = Math.max(totals.total - invoice.amountPaid, 0)
  const paidPct = totals.total > 0 ? Math.min(100, Math.round((invoice.amountPaid / totals.total) * 100)) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.reference}
        description={
          <>
            Billed to{' '}
            <Link to={`/crm/clients/${invoice.clientId}`} className="font-medium text-primary hover:underline">
              {invoice.clientName}
            </Link>
          </>
        }
        actions={<StatusBadge status={invoice.status} meta={INVOICE_STATUS_META} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium text-foreground">{line.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(line.unitPrice, invoice.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.taxPct}%</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(line.quantity * line.unitPrice * (1 + line.taxPct / 100), invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="ml-auto max-w-xs space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums">{formatCurrency(totals.taxTotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totals.total, invoice.currency)}</span>
              </div>
            </div>

            {invoice.notes ? <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{invoice.notes}</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-foreground">{paidPct}%</span>
              </div>
              <Progress value={paidPct} />
              <div className="space-y-1 pt-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-foreground">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium text-foreground">{formatCurrency(remaining, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due date</span>
                  <span className="font-medium text-foreground">{formatDate(invoice.dueDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
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
