import type { Contact } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_CONTACTS } from '@/mocks/data/contacts'
import { MOCK_CLIENT_HISTORY } from '@/mocks/data/client-history'

let contacts: Contact[] = [...MOCK_CONTACTS]

export const contactsService = {
  listByClient: (clientId: string) => withLatency(() => contacts.filter((c) => c.clientId === clientId)),

  create: (payload: Omit<Contact, 'id'>) =>
    withLatency(() => {
      const contact: Contact = { ...payload, id: generateId('con') }
      contacts = [...contacts, contact]
      return contact
    }),

  update: (id: string, payload: Partial<Contact>) =>
    withLatency(() => {
      const index = contacts.findIndex((c) => c.id === id)
      if (index === -1) throw new Error('Contact not found.')
      contacts[index] = { ...contacts[index], ...payload }
      return contacts[index]
    }),

  remove: (id: string) =>
    withLatency(() => {
      contacts = contacts.filter((c) => c.id !== id)
      return { success: true }
    }),
}

export const clientHistoryService = {
  listByClient: (clientId: string) =>
    withLatency(() =>
      MOCK_CLIENT_HISTORY.filter((h) => h.clientId === clientId).sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      ),
    ),
}
