import type { PaymentReminder } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_INVOICES } from '@/mocks/data/invoices'

resetSeed(707)

// Les relances automatiques (email/SMS) n'ont pas d'équivalent backend
// (aucun envoi réel n'est déclenché) : ça reste simulé, contrairement aux
// paiements eux-mêmes qui viennent maintenant des vraies factures — voir
// services/payments-service.ts.
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
