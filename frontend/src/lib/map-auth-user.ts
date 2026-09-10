import type { AuthRole, AuthUser } from '@/types'

// Shape returned by Django for a Role (GET /api/utilisateurs/roles/).
export interface RawRole {
  id_role: string
  libelle: string
  permissions: Record<string, Record<string, boolean>>
  user_count: number
}

// Shape returned by Django for a Utilisateur (login response, /me/, list,
// create, update — always the same UtilisateurSerializer). Shared here so
// every real API consumer (auth store, admin services) maps it identically.
export interface RawUtilisateur {
  id_utilisateur: string
  nom: string
  prenom: string
  email: string
  role: {
    id_role: string
    libelle: string
    permissions: Record<string, Record<string, boolean>>
    user_count?: number
  }
  statut: 'Actif' | 'Suspendu' | 'Desactive'
  cout_horaire: string | number
  date_creation: string
}

export function mapAuthRole(raw: RawRole): AuthRole & { userCount: number } {
  return {
    id: raw.id_role,
    libelle: raw.libelle,
    permissions: raw.permissions,
    userCount: raw.user_count,
  }
}

export function mapAuthUser(raw: RawUtilisateur): AuthUser {
  return {
    id: raw.id_utilisateur,
    nom: raw.nom,
    prenom: raw.prenom,
    email: raw.email,
    role: {
      id: raw.role.id_role,
      libelle: raw.role.libelle,
      permissions: raw.role.permissions,
    },
    statut: raw.statut,
    coutHoraire: Number(raw.cout_horaire),
    dateCreation: raw.date_creation,
  }
}
