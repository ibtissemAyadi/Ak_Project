import type { ColumnDef } from '@tanstack/react-table'
import { FileText } from 'lucide-react'

import type { DevisListItem } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { DEVIS_STATUT_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

export const devisColumns: ColumnDef<DevisListItem, any>[] = [
  {
    accessorKey: 'numero',
    header: 'Devis',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.original.numero}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.objet || '—'}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => <Badge variant="muted">v{row.original.version}</Badge>,
  },
  {
    accessorKey: 'client',
    header: 'Client',
    cell: ({ row }) => row.original.client.raisonSociale,
  },
  {
    accessorKey: 'chargeAffaires',
    header: 'Chargé d’affaires',
    cell: ({ row }) => `${row.original.chargeAffaires.prenom} ${row.original.chargeAffaires.nom}`,
  },
  {
    accessorKey: 'statut',
    header: 'Statut',
    cell: ({ row }) => <StatusBadge status={row.original.statut} meta={DEVIS_STATUT_META} />,
  },
  {
    accessorKey: 'montantTtc',
    header: 'Total TTC',
    cell: ({ row }) => <span className="font-medium tabular-nums">{formatCurrency(row.original.montantTtc)}</span>,
  },
  {
    accessorKey: 'dateValidite',
    header: 'Valable jusqu\'au',
    cell: ({ row }) => (row.original.dateValidite ? formatDate(row.original.dateValidite) : '—'),
  },
]
