import { apiFetch } from '@/lib/api-http'
import { mapAuthRole, mapAuthUser } from '@/lib/map-auth-user'
import type { RawRole, RawUtilisateur } from '@/lib/map-auth-user'
import type { AuthRole } from '@/types'

export interface AdminRole extends AuthRole {
  userCount: number
}

export interface CreateUserPayload {
  nom: string
  prenom: string
  email: string
  password: string
  role: string
  coutHoraire?: number
  statut?: 'Actif' | 'Suspendu' | 'Desactive'
}

export interface UpdateUserPayload {
  role?: string
  statut?: 'Actif' | 'Suspendu' | 'Desactive'
  coutHoraire?: number
}

function toApiPayload(payload: CreateUserPayload | UpdateUserPayload) {
  const { coutHoraire, ...rest } = payload
  return {
    ...rest,
    ...(coutHoraire !== undefined ? { cout_horaire: coutHoraire } : {}),
  }
}

export const adminUsersService = {
  list: () => apiFetch<RawUtilisateur[]>('/api/utilisateurs/').then((rows) => rows.map(mapAuthUser)),

  create: (payload: CreateUserPayload) =>
    apiFetch<RawUtilisateur>('/api/utilisateurs/', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(payload)),
    }).then(mapAuthUser),

  update: (id: string, payload: UpdateUserPayload) =>
    apiFetch<RawUtilisateur>(`/api/utilisateurs/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiPayload(payload)),
    }).then(mapAuthUser),

  remove: (id: string) => apiFetch<void>(`/api/utilisateurs/${id}/`, { method: 'DELETE' }),
}

export const adminRolesService = {
  list: (): Promise<AdminRole[]> =>
    apiFetch<RawRole[]>('/api/utilisateurs/roles/').then((rows) => rows.map(mapAuthRole)),
}
