import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  FolderKanban,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { FilterSelect } from '@/components/shared/filter-select'
import { KpiSkeleton } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { dashboardService, type DashboardFilters } from '@/services/dashboard-service'
import { devisService } from '@/services/devis-service'
import { RevenueChart } from '@/features/dashboard/components/revenue-chart'
import { QuotationsByStatusChart } from '@/features/dashboard/components/quotations-by-status-chart'
import {
  LateInvoicesPanel,
  ProjectsInProgressPanel,
  RecentActivityPanel,
  UpcomingDeadlinesPanel,
} from '@/features/dashboard/components/dashboard-panels'
import { useAuthStore } from '@/store/auth-store'

const KPI_ICON_BY_LABEL: Record<string, LucideIcon> = {
  'Projets actifs': FolderKanban,
  'Affaires en retard': Clock,
  'Devis ouverts': FileText,
  'Devis à valider': CheckCircle2,
  'Montant en attente': Wallet,
  'Paiements encaissés': DollarSign,
  'Factures en retard': AlertTriangle,
}

const PERIODE_OPTIONS = [
  { value: 'mois', label: 'Ce mois-ci' },
  { value: 'trimestre', label: 'Ce trimestre' },
  { value: 'annee', label: 'Cette année' },
]

function calculerPeriode(preset: string): { from?: string; to?: string } {
  if (preset === 'all') return {}
  const maintenant = new Date()
  const to = maintenant.toISOString().slice(0, 10)
  let from: Date
  if (preset === 'mois') {
    from = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
  } else if (preset === 'trimestre') {
    from = new Date(maintenant.getFullYear(), Math.floor(maintenant.getMonth() / 3) * 3, 1)
  } else {
    from = new Date(maintenant.getFullYear(), 0, 1)
  }
  return { from: from.toISOString().slice(0, 10), to }
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [periode, setPeriode] = useState('all')
  const [chargeAffaires, setChargeAffaires] = useState('all')

  const { data: intervenants } = useAsync(() => devisService.intervenants(), [])

  const filters: DashboardFilters = useMemo(() => {
    const { from, to } = calculerPeriode(periode)
    return { from, to, chargeAffairesId: chargeAffaires === 'all' ? undefined : chargeAffaires }
  }, [periode, chargeAffaires])

  const { data, isLoading, error, refetch } = useAsync(() => dashboardService.getOverview(filters), [filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenue${user ? `, ${user.prenom}` : ''}`}
        description="Voici ce qui se passe aujourd'hui sur vos projets, devis et factures."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Période"
              value={periode}
              onChange={setPeriode}
              options={PERIODE_OPTIONS}
              allLabel="Toute période"
            />
            <FilterSelect
              label="Chargé d'affaires"
              value={chargeAffaires}
              onChange={setChargeAffaires}
              options={(intervenants ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
              allLabel="Tous les chargés d'affaires"
              className="h-9 w-[220px]"
            />
          </div>
        }
      />

      {isLoading ? (
        <KpiSkeleton count={7} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.kpis.map((kpi) => (
              <StatCard key={kpi.label} {...kpi} icon={KPI_ICON_BY_LABEL[kpi.label] ?? FileText} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RevenueChart data={data.revenue} />
            <QuotationsByStatusChart data={data.quotationsByStatus} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProjectsInProgressPanel affaires={data.projectsInProgress} />
            <LateInvoicesPanel invoices={data.lateInvoices} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentActivityPanel activities={data.recentActivities} />
            <UpcomingDeadlinesPanel deadlines={data.upcomingDeadlines} />
          </div>
        </>
      ) : null}
    </div>
  )
}
