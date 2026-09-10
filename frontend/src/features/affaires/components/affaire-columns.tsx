import type { ColumnDef } from '@tanstack/react-table'
import { Briefcase } from 'lucide-react'

import type { Affaire } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AFFAIRE_PRIORITE_META } from '@/lib/constants'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'

export const affaireColumns: ColumnDef<Affaire, any>[] = [
  {
    accessorKey: 'numeroAffaire',
    header: 'Affaire',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent-foreground">
          <Briefcase className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.original.numeroAffaire}</p>
          <p className="truncate text-xs text-foreground/70">{row.original.objet || '—'}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'client',
    header: 'Client',
    cell: ({ row }) => row.original.client.raisonSociale,
  },
  {
    id: 'chargeAffaires',
    header: "Chargé d'affaires",
    accessorFn: (row) => `${row.chargeAffaires.prenom} ${row.chargeAffaires.nom}`,
  },
  {
    accessorKey: 'etatAvancement',
    header: 'Avancement',
    cell: ({ row }) => (
      <div className="flex w-32 items-center gap-2">
        <Progress value={row.original.etatAvancement} className="h-2.5" />
        <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">{row.original.etatAvancement}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'heuresRestantes',
    header: () => <div className="text-right">Heures restantes</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatNumber(row.original.heuresRestantes)} / {formatNumber(row.original.heuresPrevues)} h
      </div>
    ),
  },
  {
    accessorKey: 'budget',
    header: () => <div className="text-right">Budget</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">{formatCurrency(row.original.budget)}</div>
    ),
  },
  {
    accessorKey: 'priorite',
    header: 'Priorité',
    cell: ({ row }) => {
      const meta = AFFAIRE_PRIORITE_META[row.original.priorite]
      return <Badge variant={meta?.variant ?? 'muted'}>{meta?.label ?? row.original.priorite}</Badge>
    },
  },
  {
    accessorKey: 'dateFinPrevue',
    header: 'Échéance prévue',
    cell: ({ row }) => {
      const date = row.original.dateFinPrevue
      if (!date) return '—'
      const aujourdHui = new Date().toISOString().slice(0, 10)
      const dansSeptJours = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      const isTerminee = row.original.etatAvancement >= 100
      const classe = isTerminee
        ? 'text-muted-foreground'
        : date < aujourdHui
          ? 'font-medium text-destructive'
          : date <= dansSeptJours
            ? 'font-medium text-warning'
            : 'text-foreground'
      return <span className={classe}>{formatDate(date)}</span>
    },
  },
]
