import type { Contact } from '@/types'
import { randomFullName, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_CLIENTS } from '@/mocks/data/clients'

resetSeed(202)

const JOB_TITLES = [
  'Procurement Director', 'Chief Engineer', 'Operations Manager', 'CFO',
  'Project Sponsor', 'Site Director', 'Technical Lead', 'Legal Counsel',
]

export const MOCK_CONTACTS: Contact[] = MOCK_CLIENTS.flatMap((client, clientIndex) => {
  const count = randomInt(2, 4)
  return Array.from({ length: count }).map((_, i) => {
    const name = randomFullName()
    const [firstName, ...rest] = name.split(' ')
    const lastName = rest.join(' ')
    return {
      id: `con-${clientIndex + 1}-${i + 1}`,
      clientId: client.id,
      firstName,
      lastName,
      jobTitle: JOB_TITLES[(clientIndex + i) % JOB_TITLES.length],
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@${client.name
        .toLowerCase()
        .replace(/[^a-z]+/g, '')}.com`,
      phone: `+33 6 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
      isPrimary: i === 0,
    } satisfies Contact
  })
})

export function getContactsByClient(clientId: string) {
  return MOCK_CONTACTS.filter((c) => c.clientId === clientId)
}
