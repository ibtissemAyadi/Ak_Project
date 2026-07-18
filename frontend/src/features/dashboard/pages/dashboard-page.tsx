import {
  DollarSign,
  FolderKanban,
  FileText,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { KpiSkeleton } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { dashboardService } from '@/services/dashboard-service'
import { RevenueChart } from '@/features/dashboard/components/revenue-chart'
import { QuotationsByStatusChart } from '@/features/dashboard/components/quotations-by-status-chart'
import {
  LateInvoicesPanel,
  ProjectsInProgressPanel,
  RecentActivityPanel,
  UpcomingDeadlinesPanel,
} from '@/features/dashboard/components/dashboard-panels'
import { useAuthStore } from '@/store/auth-store'

const KPI_ICONS = [DollarSign, FolderKanban, FileText, Wallet, TrendingUp, AlertTriangle]

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, error, refetch } = useAsync(() => dashboardService.getOverview(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${user ? `, ${user.prenom}` : ''}`}
        description="Here is what's happening across your projects, quotations and invoices today."
      />

      {isLoading ? (
        <KpiSkeleton count={6} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((kpi, i) => (
              <StatCard key={kpi.label} {...kpi} icon={KPI_ICONS[i % KPI_ICONS.length]} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RevenueChart data={data.revenue} />
            <QuotationsByStatusChart data={data.quotationsByStatus} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProjectsInProgressPanel projects={data.projectsInProgress} />
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
