import type { Client, ClientStatus, ClientType } from '@/types'
import { CITIES, COMPANY_POOL, INDUSTRIES, pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_USERS } from '@/mocks/data/users'

resetSeed(101)

const STATUS_POOL: ClientStatus[] = ['active', 'active', 'active', 'prospect', 'prospect', 'inactive']
const TYPE_POOL: ClientType[] = ['company', 'company', 'company', 'government', 'individual']

const accountManagers = MOCK_USERS.filter((u) => u.role === 'sales' || u.role === 'manager')

export const MOCK_CLIENTS: Client[] = COMPANY_POOL.map((name, index) => {
  const id = `cli-${index + 1}`
  const location = CITIES[index % CITIES.length]
  const manager = accountManagers[index % accountManagers.length]
  const created = new Date()
  created.setDate(created.getDate() - randomInt(30, 900))
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '')

  return {
    id,
    name,
    type: pick(TYPE_POOL),
    status: pick(STATUS_POOL),
    industry: pick(INDUSTRIES),
    email: `contact@${slug}.com`,
    phone: `+33 1 ${randomInt(40, 59)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
    website: `https://www.${slug}.com`,
    address: `${randomInt(2, 240)} Avenue de l'Industrie`,
    city: location.city,
    country: location.country,
    taxId: `FR${randomInt(10000000000, 99999999999)}`,
    accountManagerId: manager.id,
    accountManagerName: `${manager.firstName} ${manager.lastName}`,
    tags: pick([
      ['strategic', 'long-term'],
      ['high-value'],
      ['new-business'],
      ['public-sector'],
      ['fast-growth'],
    ]),
    totalRevenue: randomInt(45, 2400) * 1000,
    openQuotations: randomInt(0, 6),
    activeProjects: randomInt(0, 5),
    createdAt: created.toISOString(),
    notes: 'Key relationship managed jointly with the engineering and finance teams.',
  }
})

export function getClientById(id: string) {
  return MOCK_CLIENTS.find((c) => c.id === id)
}
