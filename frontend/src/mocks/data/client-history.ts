import type { ClientHistoryEntry, ClientHistoryType } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_USERS } from '@/mocks/data/users'

resetSeed(303)

const ENTRIES: { type: ClientHistoryType; title: string; description: string }[] = [
  { type: 'call', title: 'Discovery call', description: 'Discussed upcoming site expansion and budget window for Q3.' },
  { type: 'email', title: 'Follow-up email sent', description: 'Shared technical brief and preliminary cost estimate.' },
  { type: 'meeting', title: 'On-site kickoff meeting', description: 'Reviewed scope of works with site engineering team.' },
  { type: 'quotation', title: 'Quotation issued', description: 'Sent quotation for structural assessment phase 1.' },
  { type: 'invoice', title: 'Invoice issued', description: 'Invoice generated for completed milestone.' },
  { type: 'project', title: 'Project kicked off', description: 'Project moved to in-progress after contract signature.' },
  { type: 'note', title: 'Internal note', description: 'Client requested revised timeline due to permitting delays.' },
]

export const MOCK_CLIENT_HISTORY: ClientHistoryEntry[] = MOCK_CLIENTS.flatMap((client, clientIndex) => {
  const count = randomInt(3, 6)
  return Array.from({ length: count }).map((_, i) => {
    const entry = pick(ENTRIES)
    const author = pick(MOCK_USERS)
    const created = new Date()
    created.setDate(created.getDate() - randomInt(1, 260))
    return {
      id: `hist-${clientIndex + 1}-${i + 1}`,
      clientId: client.id,
      type: entry.type,
      title: entry.title,
      description: entry.description,
      authorName: `${author.firstName} ${author.lastName}`,
      createdAt: created.toISOString(),
    } satisfies ClientHistoryEntry
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
})

export function getHistoryByClient(clientId: string) {
  return MOCK_CLIENT_HISTORY.filter((h) => h.clientId === clientId).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  )
}
