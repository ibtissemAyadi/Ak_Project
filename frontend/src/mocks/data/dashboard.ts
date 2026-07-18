import type { KpiSummary, RecentActivity, RevenuePoint, UpcomingDeadline } from '@/types'
import { MOCK_QUOTATIONS } from '@/mocks/data/quotations'
import { MOCK_PROJECTS } from '@/mocks/data/projects'
import { MOCK_INVOICES, computeInvoiceTotal } from '@/mocks/data/invoices'
import { MOCK_USERS } from '@/mocks/data/users'
import { randomInt, resetSeed } from '@/mocks/generators'

resetSeed(909)

export const REVENUE_CHART: RevenuePoint[] = [
  { month: 'Jan', revenue: 182000, target: 170000 },
  { month: 'Feb', revenue: 194000, target: 175000 },
  { month: 'Mar', revenue: 168000, target: 180000 },
  { month: 'Apr', revenue: 221000, target: 185000 },
  { month: 'May', revenue: 235000, target: 190000 },
  { month: 'Jun', revenue: 209000, target: 195000 },
  { month: 'Jul', revenue: 248000, target: 200000 },
  { month: 'Aug', revenue: 226000, target: 205000 },
  { month: 'Sep', revenue: 261000, target: 210000 },
  { month: 'Oct', revenue: 278000, target: 215000 },
  { month: 'Nov', revenue: 254000, target: 220000 },
  { month: 'Dec', revenue: 291000, target: 225000 },
]

const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === 'overdue')
const paidTotal = MOCK_INVOICES.reduce((sum, inv) => sum + inv.amountPaid, 0)
const outstandingTotal = MOCK_INVOICES.reduce((sum, inv) => {
  const { total } = computeInvoiceTotal(inv.lines)
  return sum + Math.max(total - inv.amountPaid, 0)
}, 0)

export const DASHBOARD_KPIS: KpiSummary[] = [
  { label: 'Monthly Revenue', value: 291000, format: 'currency', deltaPct: 12.4, trend: 'up' },
  { label: 'Active Projects', value: MOCK_PROJECTS.filter((p) => p.status === 'in_progress').length, format: 'number', deltaPct: 4.1, trend: 'up' },
  { label: 'Open Quotations', value: MOCK_QUOTATIONS.filter((q) => ['sent', 'under_review'].includes(q.status)).length, format: 'number', deltaPct: -2.3, trend: 'down' },
  { label: 'Outstanding Amount', value: Math.round(outstandingTotal), format: 'currency', deltaPct: -6.8, trend: 'down' },
  { label: 'Payments Collected', value: Math.round(paidTotal), format: 'currency', deltaPct: 9.2, trend: 'up' },
  { label: 'Overdue Invoices', value: overdueInvoices.length, format: 'number', deltaPct: 3.5, trend: 'up' },
]

export const QUOTATIONS_BY_STATUS = ['draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired'].map(
  (status) => ({
    status,
    count: MOCK_QUOTATIONS.filter((q) => q.status === status).length,
  }),
)

export const PROJECTS_IN_PROGRESS = MOCK_PROJECTS.filter((p) => p.status === 'in_progress').slice(0, 6)

export const LATE_INVOICES = overdueInvoices.slice(0, 6)

export const UPCOMING_DEADLINES: UpcomingDeadline[] = [
  ...MOCK_PROJECTS.filter((p) => p.status === 'in_progress').slice(0, 3).map((p) => ({
    id: `dl-${p.id}`,
    title: p.name,
    type: 'project' as const,
    dueDate: p.endDate,
    owner: p.managerName,
  })),
  ...MOCK_QUOTATIONS.filter((q) => q.status === 'sent').slice(0, 3).map((q) => ({
    id: `dl-${q.id}`,
    title: q.title,
    type: 'quotation' as const,
    dueDate: q.validUntil,
    owner: q.owner,
  })),
  ...MOCK_INVOICES.filter((i) => i.status === 'sent').slice(0, 3).map((i) => ({
    id: `dl-${i.id}`,
    title: `${i.reference} - ${i.clientName}`,
    type: 'invoice' as const,
    dueDate: i.dueDate,
    owner: i.clientName,
  })),
].sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))

const ACTIONS = [
  'created quotation', 'updated project status on', 'uploaded a document to',
  'sent invoice', 'logged time on', 'added a comment to', 'marked a milestone complete on',
]

export const RECENT_ACTIVITIES: RecentActivity[] = Array.from({ length: 10 }).map((_, index) => {
  const actor = MOCK_USERS[index % MOCK_USERS.length]
  const target = [...MOCK_PROJECTS, ...MOCK_QUOTATIONS][index % 8]
  const created = new Date()
  created.setHours(created.getHours() - randomInt(1, 96))
  return {
    id: `act-${index + 1}`,
    actorName: `${actor.firstName} ${actor.lastName}`,
    action: ACTIONS[index % ACTIONS.length],
    target: 'name' in target ? target.name : target.title,
    createdAt: created.toISOString(),
  }
})
