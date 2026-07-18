import type { Client } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_CLIENTS } from '@/mocks/data/clients'

let clients: Client[] = [...MOCK_CLIENTS]

export const clientsService = {
  list: () => withLatency(() => [...clients].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))),

  getById: (id: string) =>
    withLatency(() => {
      const client = clients.find((c) => c.id === id)
      if (!client) throw new Error('Client not found.')
      return client
    }),

  create: (payload: Omit<Client, 'id' | 'createdAt' | 'totalRevenue' | 'openQuotations' | 'activeProjects'>) =>
    withLatency(
      () => {
        const client: Client = {
          ...payload,
          id: generateId('cli'),
          createdAt: new Date().toISOString(),
          totalRevenue: 0,
          openQuotations: 0,
          activeProjects: 0,
        }
        clients = [client, ...clients]
        return client
      },
      { failRate: 0.05 },
    ),

  update: (id: string, payload: Partial<Client>) =>
    withLatency(
      () => {
        const index = clients.findIndex((c) => c.id === id)
        if (index === -1) throw new Error('Client not found.')
        clients[index] = { ...clients[index], ...payload }
        return clients[index]
      },
      { failRate: 0.05 },
    ),

  remove: (id: string) =>
    withLatency(() => {
      clients = clients.filter((c) => c.id !== id)
      return { success: true }
    }),
}
