import { withLatency } from '@/lib/api-client'
import {
  DASHBOARD_KPIS,
  REVENUE_CHART,
  QUOTATIONS_BY_STATUS,
  PROJECTS_IN_PROGRESS,
  LATE_INVOICES,
  UPCOMING_DEADLINES,
  RECENT_ACTIVITIES,
} from '@/mocks/data/dashboard'

export const dashboardService = {
  getOverview: () =>
    withLatency(() => ({
      kpis: DASHBOARD_KPIS,
      revenue: REVENUE_CHART,
      quotationsByStatus: QUOTATIONS_BY_STATUS,
      projectsInProgress: PROJECTS_IN_PROGRESS,
      lateInvoices: LATE_INVOICES,
      upcomingDeadlines: UPCOMING_DEADLINES,
      recentActivities: RECENT_ACTIVITIES,
    })),
}
