import { apiFetch } from '@/lib/api-http'
import type { CrmClient, CrmClientStatut } from '@/types'

// Shape returned by Django for a Client (crm.ClientSerializer).
interface RawClient {
  id_client: string
  raison_sociale: string
  matricule_fiscal: string | null
  adresse: string
  pays: string
  secteur_activite: string
  statut: CrmClientStatut
  telephone: string
  email: string
  date_creation: string
  date_modification: string
}

function mapClient(raw: RawClient): CrmClient {
  return {
    id: raw.id_client,
    raisonSociale: raw.raison_sociale,
    matriculeFiscal: raw.matricule_fiscal ?? '',
    adresse: raw.adresse,
    pays: raw.pays,
    secteurActivite: raw.secteur_activite,
    statut: raw.statut,
    telephone: raw.telephone,
    email: raw.email,
    dateCreation: raw.date_creation,
    dateModification: raw.date_modification,
  }
}

export interface ClientPayload {
  raisonSociale: string
  matriculeFiscal?: string
  adresse?: string
  pays?: string
  secteurActivite?: string
  statut: CrmClientStatut
  telephone?: string
  email?: string
}

function toApiPayload(payload: Partial<ClientPayload>) {
  return {
    ...(payload.raisonSociale !== undefined ? { raison_sociale: payload.raisonSociale } : {}),
    ...(payload.matriculeFiscal !== undefined ? { matricule_fiscal: payload.matriculeFiscal } : {}),
    ...(payload.adresse !== undefined ? { adresse: payload.adresse } : {}),
    ...(payload.pays !== undefined ? { pays: payload.pays } : {}),
    ...(payload.secteurActivite !== undefined ? { secteur_activite: payload.secteurActivite } : {}),
    ...(payload.statut !== undefined ? { statut: payload.statut } : {}),
    ...(payload.telephone !== undefined ? { telephone: payload.telephone } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
  }
}

// Real backend-backed CRM client service — GET/POST/PUT/PATCH only, no
// DELETE (a client is never deleted, only moved to statut 'Inactif').
export const clientsService = {
  list: (): Promise<CrmClient[]> => apiFetch<RawClient[]>('/api/clients/').then((rows) => rows.map(mapClient)),

  getById: (id: string): Promise<CrmClient> => apiFetch<RawClient>(`/api/clients/${id}/`).then(mapClient),

  create: (payload: ClientPayload): Promise<CrmClient> =>
    apiFetch<RawClient>('/api/clients/', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(payload)),
    }).then(mapClient),

  update: (id: string, payload: Partial<ClientPayload>): Promise<CrmClient> =>
    apiFetch<RawClient>(`/api/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiPayload(payload)),
    }).then(mapClient),
}
