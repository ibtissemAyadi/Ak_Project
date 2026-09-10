import type { ColumnDef } from '@tanstack/react-table'

import type { Facture } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { FACTURE_STATUT_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

export const factureColumns: ColumnDef<Facture, any>[] = [
  {
    accessorKey: 'numeroFacture',
    header: 'Facture',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.numeroFacture}</p>
        <p className="text-xs text-muted-foreground">{row.original.objet}</p>
      </div>
    ),
  },
  {
    id: 'client',
    header: 'Client',
    accessorFn: (row) => row.client.raisonSociale,
  },
  {
    accessorKey: 'statut',
    header: 'Statut',
    cell: ({ row }) => <StatusBadge status={row.original.statut} meta={FACTURE_STATUT_META} />,
  },
  {
    accessorKey: 'montantTotal',
    header: 'Montant',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{formatCurrency(row.original.montantTotal)}</span>
    ),
  },
  {
    accessorKey: 'dateFacture',
    header: 'Émise le',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.dateFacture)}</span>,
  },
  {
    accessorKey: 'dateEcheance',
    header: 'Échéance',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.dateEcheance)}</span>,
  },
]
