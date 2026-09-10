import { apiFetch } from '@/lib/api-http'
import type { RecentActivity } from '@/types'

interface RawActivite {
  id_activite: string
  utilisateur_nom: string
  action: string
  cible: string
  date_creation: string
}

function mapActivite(raw: RawActivite): RecentActivity {
  return {
    id: raw.id_activite,
    actorName: raw.utilisateur_nom,
    action: raw.action,
    target: raw.cible,
    createdAt: raw.date_creation,
  }
}

export interface ActiviteFilters {
  utilisateurId?: string
  depuis?: string
  jusqua?: string
}

function buildQuery(limit: number, filters: ActiviteFilters = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (filters.utilisateurId) params.set('utilisateur', filters.utilisateurId)
  if (filters.depuis) params.set('depuis', filters.depuis)
  if (filters.jusqua) params.set('jusqua', filters.jusqua)
  return params.toString()
}

export const activitesService = {
  list: (limit = 10, filters?: ActiviteFilters): Promise<RecentActivity[]> =>
    apiFetch<RawActivite[]>(`/api/activites/?${buildQuery(limit, filters)}`).then((rows) => rows.map(mapActivite)),

  listByCible: (cible: string, limit = 20): Promise<RecentActivity[]> =>
    apiFetch<RawActivite[]>(`/api/activites/?cible=${encodeURIComponent(cible)}&limit=${limit}`).then((rows) =>
      rows.map(mapActivite),
    ),
}
