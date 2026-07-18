import type { ColumnDef } from '@tanstack/react-table'
import { CreditCard } from 'lucide-react'

import type { Payment } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { PAYMENT_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card',
  check: 'Check',
  cash: 'Cash',
}

export const paymentColumns: ColumnDef<Payment, any>[] = [
  {
    accessorKey: 'reference',
    header: 'Payment',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.reference}</p>
          <p className="text-xs text-muted-foreground">{row.original.invoiceReference}</p>
        </div>
      </div>
    ),
  },
  { accessorKey: 'clientName', header: 'Client' },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => <span className="text-muted-foreground">{METHOD_LABELS[row.original.method]}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} meta={PAYMENT_STATUS_META} />,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{formatCurrency(row.original.amount, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'paidAt',
    header: 'Date',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.paidAt)}</span>,
  },
]
