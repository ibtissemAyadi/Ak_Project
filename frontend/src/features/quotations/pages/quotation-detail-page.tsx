import type { ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, FileClock, Pencil, Send, XCircle } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/use-async'
import { quotationsService } from '@/services/quotations-service'
import { computeQuotationTotal } from '@/mocks/data/quotations'
import { QUOTATION_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import type { QuotationStatus } from '@/types'

const NEXT_ACTIONS: Partial<Record<QuotationStatus, { label: string; to: QuotationStatus; icon: typeof Send }[]>> = {
  draft: [{ label: 'Send to client', to: 'sent', icon: Send }],
  sent: [
    { label: 'Mark under review', to: 'under_review', icon: FileClock },
    { label: 'Mark accepted', to: 'accepted', icon: CheckCircle2 },
    { label: 'Mark rejected', to: 'rejected', icon: XCircle },
  ],
  under_review: [
    { label: 'Mark accepted', to: 'accepted', icon: CheckCircle2 },
    { label: 'Mark rejected', to: 'rejected', icon: XCircle },
  ],
}

export function QuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>()
  const navigate = useNavigate()
  const { data: quotation, isLoading, error, refetch } = useAsync(
    () => quotationsService.getById(quotationId!),
    [quotationId],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !quotation) return <ErrorState onRetry={refetch} description="We could not load this quotation." />

  const totals = computeQuotationTotal(quotation.lines)
  const actions = NEXT_ACTIONS[quotation.status] ?? []

  const handleStatusChange = async (status: QuotationStatus) => {
    await quotationsService.updateStatus(quotation.id, status)
    toast.success(`Quotation marked as ${QUOTATION_STATUS_META[status]?.label ?? status}.`)
    refetch()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.reference}
        description={quotation.title}
        actions={
          <>
            {actions.map((action) => (
              <Button key={action.to} variant="outline" className="gap-2" onClick={() => handleStatusChange(action.to)}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
            <Button className="gap-2" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryTile label="Client">
          <Link to={`/crm/clients/${quotation.clientId}`} className="text-sm font-medium text-primary hover:underline">
            {quotation.clientName}
          </Link>
        </SummaryTile>
        <SummaryTile label="Status">
          <StatusBadge status={quotation.status} meta={QUOTATION_STATUS_META} />
        </SummaryTile>
        <SummaryTile label="Valid Until">
          <p className="text-sm font-medium text-foreground">{formatDate(quotation.validUntil)}</p>
        </SummaryTile>
      </div>

      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">Line Items</TabsTrigger>
          <TabsTrigger value="versions">Versions ({quotation.versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.lines.map((line) => {
                    const base = line.quantity * line.unitPrice
                    const discounted = base * (1 - line.discountPct / 100)
                    const lineTotal = discounted * (1 + line.taxPct / 100)
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium text-foreground">{line.description}</TableCell>
                        <TableCell className="text-muted-foreground">{line.category}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.quantity} {line.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(line.unitPrice, quotation.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums">{line.discountPct}%</TableCell>
                        <TableCell className="text-right tabular-nums">{line.taxPct}%</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(lineTotal, quotation.currency)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="ml-auto max-w-xs space-y-1.5 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(totals.discountTotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrency(totals.taxTotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(totals.total, quotation.currency)}</span>
                </div>
              </div>

              {quotation.notes ? (
                <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{quotation.notes}</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...quotation.versions].reverse().map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant={v.version === quotation.currentVersion ? 'default' : 'muted'}>v{v.version}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(v.createdAt)}</TableCell>
                      <TableCell>{v.createdBy}</TableCell>
                      <TableCell className="text-muted-foreground">{v.changeSummary}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(v.total, quotation.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1.5 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  )
}
