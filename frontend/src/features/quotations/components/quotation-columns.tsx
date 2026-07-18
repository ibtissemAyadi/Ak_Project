import type { ColumnDef } from '@tanstack/react-table'

import type { Quotation } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { QUOTATION_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { computeQuotationTotal } from '@/mocks/data/quotations'

export const quotationColumns: ColumnDef<Quotation, any>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.reference}</p>
        <p className="truncate text-xs text-muted-foreground max-w-[220px]">{row.original.title}</p>
      </div>
    ),
  },
  { accessorKey: 'clientName', header: 'Client' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} meta={QUOTATION_STATUS_META} />,
  },
  { accessorKey: 'owner', header: 'Owner' },
  {
    id: 'total',
    header: 'Amount',
    accessorFn: (row) => computeQuotationTotal(row.lines).total,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatCurrency(computeQuotationTotal(row.original.lines).total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'validUntil',
    header: 'Valid Until',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.validUntil)}</span>,
  },
]
