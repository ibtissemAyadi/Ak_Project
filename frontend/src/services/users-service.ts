import type { AppUser } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_USERS } from '@/mocks/data/users'
import { MOCK_ROLES } from '@/mocks/data/roles'

let users: AppUser[] = [...MOCK_USERS]

export const usersService = {
  list: () => withLatency(() => [...users]),

  getById: (id: string) =>
    withLatency(() => {
      const user = users.find((u) => u.id === id)
      if (!user) throw new Error('User not found.')
      return user
    }),

  invite: (payload: Omit<AppUser, 'id' | 'status' | 'lastActiveAt' | 'createdAt'>) =>
    withLatency(
      () => {
        const now = new Date().toISOString()
        const user: AppUser = { ...payload, id: generateId('usr'), status: 'invited', lastActiveAt: now, createdAt: now }
        users = [user, ...users]
        return user
      },
      { failRate: 0.05 },
    ),

  update: (id: string, payload: Partial<AppUser>) =>
    withLatency(() => {
      const index = users.findIndex((u) => u.id === id)
      if (index === -1) throw new Error('User not found.')
      users[index] = { ...users[index], ...payload }
      return users[index]
    }),

  remove: (id: string) =>
    withLatency(() => {
      users = users.filter((u) => u.id !== id)
      return { success: true }
    }),
}

export const rolesService = {
  list: () => withLatency(() => [...MOCK_ROLES]),
}
