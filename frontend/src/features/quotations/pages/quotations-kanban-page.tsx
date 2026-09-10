import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { KanbanBoard } from '@/components/shared/kanban-board'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { devisService } from '@/services/devis-service'
import { ApiHttpError } from '@/lib/api-http'
import { DEVIS_STATUT_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { DevisListItem, DevisStatut } from '@/types'

const STATUS_ORDER: DevisStatut[] = [
  'Brouillon',
  'En_preparation',
  'A_valider',
  'Envoye',
  'Accepte',
  'Refuse',
  'Annule',
]

const ACCENT: Record<DevisStatut, string> = {
  Brouillon: 'bg-muted-foreground',
  En_preparation: 'bg-secondary',
  A_valider: 'bg-warning',
  Envoye: 'bg-info',
  Accepte: 'bg-success',
  Refuse: 'bg-destructive',
  Annule: 'bg-secondary',
}

export function QuotationsKanbanPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => devisService.list(), [])
  const [localDevis, setLocalDevis] = useState<DevisListItem[] | null>(null)

  const devisList = localDevis ?? data ?? []

  const columns = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        id: status,
        label: DEVIS_STATUT_META[status].label,
        items: devisList.filter((d) => d.statut === status),
        accentClass: ACCENT[status],
      })),
    [devisList],
  )

  const handleMove = async (itemId: string, targetColumnId: string) => {
    const statut = targetColumnId as DevisStatut
    setLocalDevis((prev) =>
      (prev ?? data ?? []).map((d) => (d.id === itemId ? { ...d, statut } : d)),
    )
    try {
      await devisService.transition(itemId, statut)
      toast.success(`Déplacé vers ${DEVIS_STATUT_META[statut].label}`)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de mettre à jour le statut. Annulation.')
      setLocalDevis(null)
      refetch()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis Kanban"
        description="Glissez les devis d'une colonne à l'autre pour mettre à jour leur statut."
        actions={
          <Button variant="outline" onClick={() => navigate('/devis')}>
            Vue tableau
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <KanbanBoard
          columns={columns}
          getItemId={(item) => item.id}
          onMoveItem={handleMove}
          renderCard={(d) => (
            <div className="space-y-2" onClick={() => navigate(`/devis/${d.id}`)}>
              <p className="text-xs font-medium text-muted-foreground">{d.numero}</p>
              <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{d.objet || '—'}</p>
              <p className="text-xs text-muted-foreground">{d.client.raisonSociale}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-foreground">
                  {formatCurrency(d.montantTtc)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {d.dateValidite ? `Valable ${formatDate(d.dateValidite)}` : ''}
                </span>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
