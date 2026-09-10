import type { ColumnDef } from '@tanstack/react-table'

import type { AuthUser } from '@/types'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { formatDate } from '@/lib/formatters'

const STATUT_VARIANT: Record<AuthUser['statut'], 'success' | 'warning' | 'muted'> = {
  Actif: 'success',
  Suspendu: 'warning',
  Desactive: 'muted',
}

const STATUT_LABELS: Record<AuthUser['statut'], string> = {
  Actif: 'Actif',
  Suspendu: 'Suspendu',
  Desactive: 'Désactivé',
}

export const userColumns: ColumnDef<AuthUser, any>[] = [
  {
    accessorKey: 'nom',
    header: 'Utilisateur',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={`${row.original.prenom} ${row.original.nom}`} className="h-8 w-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.prenom} {row.original.nom}
          </p>
          <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Rôle',
    cell: ({ row }) => <Badge variant="secondary">{row.original.role.libelle}</Badge>,
  },
  {
    accessorKey: 'coutHoraire',
    header: 'Coût horaire',
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">€{row.original.coutHoraire}</span>,
  },
  {
    accessorKey: 'statut',
    header: 'Statut',
    cell: ({ row }) => <Badge variant={STATUT_VARIANT[row.original.statut]}>{STATUT_LABELS[row.original.statut]}</Badge>,
  },
  {
    accessorKey: 'dateCreation',
    header: 'Créé le',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.dateCreation)}</span>,
  },
]
