import type { ColumnDef } from '@tanstack/react-table'

import type { Invoice } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { INVOICE_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { computeInvoiceTotal } from '@/mocks/data/invoices'

export const invoiceColumns: ColumnDef<Invoice, any>[] = [
  {
    accessorKey: 'reference',
    header: 'Invoice',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.reference}</p>
        <p className="text-xs text-muted-foreground">{row.original.projectName ?? '—'}</p>
      </div>
    ),
  },
  { accessorKey: 'clientName', header: 'Client' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} meta={INVOICE_STATUS_META} />,
  },
  {
    id: 'total',
    header: 'Amount',
    accessorFn: (row) => computeInvoiceTotal(row.lines).total,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatCurrency(computeInvoiceTotal(row.original.lines).total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'issueDate',
    header: 'Issued',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.issueDate)}</span>,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.dueDate)}</span>,
  },
]
