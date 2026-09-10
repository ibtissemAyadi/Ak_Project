import type { ColumnDef } from '@tanstack/react-table'
import { Building2 } from 'lucide-react'

import type { CrmClient } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { CLIENT_STATUS_META } from '@/lib/constants'

export const clientColumns: ColumnDef<CrmClient, any>[] = [
  {
    accessorKey: 'raisonSociale',
    header: 'Client',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.original.raisonSociale}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.matriculeFiscal || '—'}</p>
        </div>
      </div>
    ),
  },
  { accessorKey: 'pays', header: 'Pays' },
  { accessorKey: 'secteurActivite', header: 'Secteur' },
  {
    accessorKey: 'statut',
    header: 'Statut',
    cell: ({ row }) => <StatusBadge status={row.original.statut} meta={CLIENT_STATUS_META} />,
  },
  { accessorKey: 'telephone', header: 'Téléphone' },
  { accessorKey: 'email', header: 'Email' },
]
