import type { Payment, PaymentMethod, PaymentReminder, PaymentStatus, PaymentTimelineEntry } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_INVOICES } from '@/mocks/data/invoices'

resetSeed(707)

const METHODS: PaymentMethod[] = ['bank_transfer', 'bank_transfer', 'credit_card', 'check', 'cash']

const paidInvoices = MOCK_INVOICES.filter((inv) => inv.amountPaid > 0)

export const MOCK_PAYMENTS: Payment[] = paidInvoices.map((invoice, index) => {
  const paidAt = new Date(invoice.issueDate)
  paidAt.setDate(paidAt.getDate() + randomInt(2, 28))
  const status: PaymentStatus = pick(['completed', 'completed', 'completed', 'pending', 'failed', 'refunded'])

  return {
    id: `pay-${index + 1}`,
    reference: `PAY-${String(7000 + index)}`,
    invoiceId: invoice.id,
    invoiceReference: invoice.reference,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    amount: invoice.amountPaid,
    currency: invoice.currency,
    method: pick(METHODS),
    status,
    paidAt: paidAt.toISOString(),
  } satisfies Payment
})

export function getPaymentsByInvoice(invoiceId: string) {
  return MOCK_PAYMENTS.filter((p) => p.invoiceId === invoiceId)
}

const unpaidInvoices = MOCK_INVOICES.filter((inv) => inv.status === 'overdue' || inv.status === 'sent')

export const MOCK_PAYMENT_REMINDERS: PaymentReminder[] = unpaidInvoices.map((invoice, index) => {
  const scheduled = new Date(invoice.dueDate)
  scheduled.setDate(scheduled.getDate() + randomInt(-3, 10))
  return {
    id: `rem-${index + 1}`,
    invoiceId: invoice.id,
    invoiceReference: invoice.reference,
    clientName: invoice.clientName,
    channel: pick(['email', 'email', 'sms']),
    scheduledFor: scheduled.toISOString(),
    status: pick(['scheduled', 'sent', 'sent', 'cancelled']),
    template: pick([
      'Friendly payment reminder - 7 days before due date',
      'Overdue notice - first reminder',
      'Overdue notice - final notice before escalation',
    ]),
  } satisfies PaymentReminder
})

export const MOCK_PAYMENT_TIMELINE: PaymentTimelineEntry[] = MOCK_INVOICES.flatMap((invoice, index) => {
  const entries: PaymentTimelineEntry[] = []
  const issue = new Date(invoice.issueDate)

  entries.push({
    id: `pt-${index + 1}-issued`,
    invoiceId: invoice.id,
    type: 'invoice_sent',
    title: 'Invoice sent',
    description: `${invoice.reference} sent to ${invoice.clientName}`,
    createdAt: issue.toISOString(),
  })

  if (invoice.status === 'overdue') {
    const reminderDate = new Date(invoice.dueDate)
    reminderDate.setDate(reminderDate.getDate() + 2)
    entries.push({
      id: `pt-${index + 1}-reminder`,
      invoiceId: invoice.id,
      type: 'reminder_sent',
      title: 'Reminder sent',
      description: 'Automatic payment reminder sent to client contact.',
      createdAt: reminderDate.toISOString(),
    })
    entries.push({
      id: `pt-${index + 1}-overdue`,
      invoiceId: invoice.id,
      type: 'overdue',
      title: 'Invoice overdue',
      description: 'Due date passed without full payment.',
      createdAt: invoice.dueDate,
    })
  }

  if (invoice.amountPaid > 0) {
    const payment = MOCK_PAYMENTS.find((p) => p.invoiceId === invoice.id)
    if (payment) {
      entries.push({
        id: `pt-${index + 1}-paid`,
        invoiceId: invoice.id,
        type: 'payment_received',
        title: 'Payment received',
        description: `${payment.amount.toLocaleString()} ${payment.currency} received via ${payment.method.replace('_', ' ')}`,
        createdAt: payment.paidAt,
      })
    }
  }

  return entries
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

export function getTimelineByInvoice(invoiceId: string) {
  return MOCK_PAYMENT_TIMELINE.filter((t) => t.invoiceId === invoiceId).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  )
}
