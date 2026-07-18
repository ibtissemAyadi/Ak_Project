import type { Invoice, InvoiceLine, InvoiceStatus } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_PROJECTS } from '@/mocks/data/projects'

resetSeed(606)

const STATUS_POOL: InvoiceStatus[] = ['draft', 'sent', 'paid', 'paid', 'partially_paid', 'overdue', 'cancelled']

const LINE_DESCRIPTIONS = [
  'Engineering design services - milestone payment',
  'Site inspection & reporting',
  'Project management fees',
  'Structural analysis deliverables',
  'Compliance & permitting support',
  'Construction supervision - monthly',
]

function buildLines(seedIndex: number): InvoiceLine[] {
  const count = randomInt(1, 4)
  return Array.from({ length: count }).map((_, i) => ({
    id: `il-${seedIndex}-${i + 1}`,
    description: pick(LINE_DESCRIPTIONS),
    quantity: randomInt(1, 5),
    unitPrice: randomInt(800, 6000),
    taxPct: 20,
  }))
}

export const MOCK_INVOICES: Invoice[] = Array.from({ length: 30 }).map((_, index) => {
  const client = MOCK_CLIENTS[(index * 3) % MOCK_CLIENTS.length]
  const relatedProjects = MOCK_PROJECTS.filter((p) => p.clientId === client.id)
  const project = relatedProjects.length ? relatedProjects[index % relatedProjects.length] : undefined

  const issue = new Date()
  issue.setDate(issue.getDate() - randomInt(5, 200))
  const due = new Date(issue)
  due.setDate(due.getDate() + 30)

  const status = STATUS_POOL[index % STATUS_POOL.length]
  const lines = buildLines(index + 1)
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 + l.taxPct / 100), 0)

  let amountPaid = 0
  if (status === 'paid') amountPaid = total
  if (status === 'partially_paid') amountPaid = Math.round(total * 0.5)

  return {
    id: `inv-${index + 1}`,
    reference: `INV-${String(5000 + index)}`,
    clientId: client.id,
    clientName: client.name,
    projectId: project?.id,
    projectName: project?.name,
    status,
    issueDate: issue.toISOString(),
    dueDate: due.toISOString(),
    currency: 'EUR',
    lines,
    amountPaid: Math.round(amountPaid),
    notes: 'Payment due within 30 days of invoice date via bank transfer.',
  } satisfies Invoice
})

export function getInvoiceById(id: string) {
  return MOCK_INVOICES.find((i) => i.id === id)
}

export function computeInvoiceTotal(lines: InvoiceLine[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const taxTotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * (l.taxPct / 100), 0)
  return { subtotal, taxTotal, total: subtotal + taxTotal }
}
