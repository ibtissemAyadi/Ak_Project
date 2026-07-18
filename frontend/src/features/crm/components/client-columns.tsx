import type { ColumnDef } from '@tanstack/react-table'
import { Building2 } from 'lucide-react'

import type { Client } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { CLIENT_STATUS_META } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'

export const clientColumns: ColumnDef<Client, any>[] = [
  {
    accessorKey: 'name',
    header: 'Client',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.city}, {row.original.country}</p>
        </div>
      </div>
    ),
  },
  { accessorKey: 'industry', header: 'Industry' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} meta={CLIENT_STATUS_META} />,
  },
  { accessorKey: 'accountManagerName', header: 'Account Manager' },
  {
    accessorKey: 'activeProjects',
    header: 'Projects',
    cell: ({ row }) => <span className="tabular-nums">{row.original.activeProjects}</span>,
  },
  {
    accessorKey: 'totalRevenue',
    header: 'Revenue',
    cell: ({ row }) => <span className="font-medium tabular-nums">{formatCurrency(row.original.totalRevenue)}</span>,
  },
]
