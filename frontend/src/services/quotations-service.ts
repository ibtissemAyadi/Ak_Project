import type { Quotation, QuotationLine, QuotationStatus } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_QUOTATIONS } from '@/mocks/data/quotations'

let quotations: Quotation[] = [...MOCK_QUOTATIONS]

export const quotationsService = {
  list: () => withLatency(() => [...quotations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))),

  getById: (id: string) =>
    withLatency(() => {
      const quotation = quotations.find((q) => q.id === id)
      if (!quotation) throw new Error('Quotation not found.')
      return quotation
    }),

  create: (payload: {
    clientId: string
    clientName: string
    title: string
    owner: string
    validUntil: string
    currency: string
    lines: QuotationLine[]
    notes?: string
  }) =>
    withLatency(
      () => {
        const quotation: Quotation = {
          id: generateId('quo'),
          reference: `QUO-${2000 + quotations.length + 1}`,
          status: 'draft',
          createdAt: new Date().toISOString(),
          currentVersion: 1,
          versions: [
            {
              id: generateId('qv'),
              version: 1,
              createdAt: new Date().toISOString(),
              createdBy: payload.owner,
              changeSummary: 'Initial version created',
              total: 0,
            },
          ],
          ...payload,
        }
        quotations = [quotation, ...quotations]
        return quotation
      },
      { failRate: 0.05 },
    ),

  update: (id: string, payload: Partial<Quotation>) =>
    withLatency(
      () => {
        const index = quotations.findIndex((q) => q.id === id)
        if (index === -1) throw new Error('Quotation not found.')
        quotations[index] = { ...quotations[index], ...payload }
        return quotations[index]
      },
      { failRate: 0.05 },
    ),

  updateStatus: (id: string, status: QuotationStatus) =>
    withLatency(() => {
      const index = quotations.findIndex((q) => q.id === id)
      if (index === -1) throw new Error('Quotation not found.')
      quotations[index] = { ...quotations[index], status }
      return quotations[index]
    }),

  remove: (id: string) =>
    withLatency(() => {
      quotations = quotations.filter((q) => q.id !== id)
      return { success: true }
    }),
}
