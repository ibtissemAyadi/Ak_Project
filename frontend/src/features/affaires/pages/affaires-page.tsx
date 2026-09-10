import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatCard } from '@/components/shared/stat-card'
import { useAsync } from '@/hooks/use-async'
import { affairesService } from '@/services/affaires-service'
import { affaireColumns } from '@/features/affaires/components/affaire-columns'

export function AffairesPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => affairesService.list(), [])

  const affaires = data ?? []

  const stats = useMemo(() => {
    const nbEnCours = affaires.filter((a) => a.etatAvancement < 100).length
    const budgetTotal = affaires.reduce((sum, a) => sum + a.budget, 0)
    return { nbEnCours, budgetTotal }
  }, [affaires])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageHeader title="Affaires" description="Toutes les affaires, créées automatiquement dès qu'un devis est accepté." />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Affaires en cours" value={stats.nbEnCours} icon={Briefcase} />
          <StatCard label="Budget total piloté" value={stats.budgetTotal} format="currency" icon={Wallet} />
        </div>
      </div>

      <DataTable
        columns={affaireColumns}
        data={affaires}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Rechercher une affaire…"
        onRowClick={(row) => navigate(`/affaires/${row.id}`)}
        emptyTitle="Aucune affaire pour l'instant"
        emptyDescription="Une affaire est créée automatiquement dès qu'un devis est accepté."
      />
    </div>
  )
}
