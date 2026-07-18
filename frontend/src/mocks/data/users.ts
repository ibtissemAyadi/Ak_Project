import type { AppUser, UserRole } from '@/types'

const DEPARTMENTS: Record<UserRole, string> = {
  admin: 'Administration',
  manager: 'Project Management',
  engineer: 'Engineering',
  accountant: 'Finance',
  sales: 'Business Development',
}

const JOB_TITLES: Record<UserRole, string> = {
  admin: 'Platform Administrator',
  manager: 'Senior Project Manager',
  engineer: 'Structural Engineer',
  accountant: 'Finance Officer',
  sales: 'Business Development Manager',
}

interface Seed {
  firstName: string
  lastName: string
  role: UserRole
  status?: AppUser['status']
}

const SEEDS: Seed[] = [
  { firstName: 'Sarah', lastName: 'Lambert', role: 'admin' },
  { firstName: 'Marc', lastName: 'Bernard', role: 'manager' },
  { firstName: 'Léa', lastName: 'Haddad', role: 'engineer' },
  { firstName: 'Thomas', lastName: 'Petit', role: 'engineer' },
  { firstName: 'Nadia', lastName: 'Moreau', role: 'accountant' },
  { firstName: 'Karim', lastName: 'Ben Salah', role: 'sales' },
  { firstName: 'Julie', lastName: 'Girard', role: 'manager' },
  { firstName: 'Antoine', lastName: 'Fontaine', role: 'engineer' },
  { firstName: 'Camille', lastName: 'Rousseau', role: 'engineer' },
  { firstName: 'Yassine', lastName: 'Trabelsi', role: 'sales' },
  { firstName: 'Elena', lastName: 'Dubois', role: 'accountant' },
  { firstName: 'David', lastName: 'Lefevre', role: 'manager', status: 'invited' },
  { firstName: 'Sophie', lastName: 'Chevalier', role: 'engineer' },
  { firstName: 'Hugo', lastName: 'Mansour', role: 'engineer', status: 'suspended' },
]

export const MOCK_USERS: AppUser[] = SEEDS.map((seed, index) => {
  const id = `usr-${index + 1}`
  const daysAgoActive = index * 3 + 1
  const daysAgoCreated = 400 - index * 12
  const lastActive = new Date()
  lastActive.setDate(lastActive.getDate() - daysAgoActive)
  const created = new Date()
  created.setDate(created.getDate() - daysAgoCreated)

  return {
    id,
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: `${seed.firstName.toLowerCase().replace(/[^a-z]/g, '')}.${seed.lastName
      .toLowerCase()
      .replace(/[^a-z]/g, '')}@ak-consulting.com`,
    phone: `+33 6 ${String(10000000 + index * 7654321).slice(0, 8)}`,
    role: seed.role,
    department: DEPARTMENTS[seed.role],
    jobTitle: JOB_TITLES[seed.role],
    status: seed.status ?? 'active',
    lastActiveAt: lastActive.toISOString(),
    createdAt: created.toISOString(),
  }
})

export const CURRENT_USER: AppUser = MOCK_USERS[0]
