import { withLatency } from '@/lib/api-client'
import { MOCK_PAYMENTS, MOCK_PAYMENT_REMINDERS, getTimelineByInvoice } from '@/mocks/data/payments'

export const paymentsService = {
  list: () => withLatency(() => [...MOCK_PAYMENTS].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))),

  getById: (id: string) =>
    withLatency(() => {
      const payment = MOCK_PAYMENTS.find((p) => p.id === id)
      if (!payment) throw new Error('Payment not found.')
      return payment
    }),

  listReminders: () => withLatency(() => [...MOCK_PAYMENT_REMINDERS]),

  getTimeline: (invoiceId: string) => withLatency(() => getTimelineByInvoice(invoiceId)),
}
