import type { Invoice } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_INVOICES } from '@/mocks/data/invoices'

let invoices: Invoice[] = [...MOCK_INVOICES]

export const invoicesService = {
  list: () => withLatency(() => [...invoices].sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1))),

  getById: (id: string) =>
    withLatency(() => {
      const invoice = invoices.find((i) => i.id === id)
      if (!invoice) throw new Error('Invoice not found.')
      return invoice
    }),

  create: (payload: Omit<Invoice, 'id' | 'reference' | 'amountPaid'>) =>
    withLatency(
      () => {
        const invoice: Invoice = {
          ...payload,
          id: generateId('inv'),
          reference: `INV-${5000 + invoices.length + 1}`,
          amountPaid: 0,
        }
        invoices = [invoice, ...invoices]
        return invoice
      },
      { failRate: 0.05 },
    ),

  update: (id: string, payload: Partial<Invoice>) =>
    withLatency(
      () => {
        const index = invoices.findIndex((i) => i.id === id)
        if (index === -1) throw new Error('Invoice not found.')
        invoices[index] = { ...invoices[index], ...payload }
        return invoices[index]
      },
      { failRate: 0.05 },
    ),

  remove: (id: string) =>
    withLatency(() => {
      invoices = invoices.filter((i) => i.id !== id)
      return { success: true }
    }),
}
