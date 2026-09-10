import { apiFetch, ApiHttpError } from '@/lib/api-http'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import type {
  Facture,
  FactureDetail,
  FactureStatut,
  LigneFacture,
  ModeReglement,
  TypeEcheance,
} from '@/types'

// ---------------------------------------------------------------------------
// Raw (snake_case) shapes returned by Django — mirrors factures/serializers.py
// ---------------------------------------------------------------------------

interface RawClientMini {
  id_client: string
  raison_sociale: string
  email: string
}

interface RawLigneFacture {
  id_ligne: string
  facture: string
  description: string
  quantite: string | number | null
  prix_unitaire: string | number | null
  montant: string | number
}

interface RawFacture {
  id_facture: string
  numero_facture: string
  affaire: string
  numero_affaire: string
  numero_devis: string
  objet: string
  client: RawClientMini
  statut: FactureStatut
  date_facture: string
  date_echeance: string
  mode_reglement: ModeReglement
  type_echeance: TypeEcheance
  nombre_jours: number | null
  jour_fixe_mois_suivant: number | null
  label_echeance: string
  sous_total: string | number
  montant_tva: string | number
  montant_total: string | number
  montant_a_payer: string | number
  date_creation: string
  date_modification: string
}

interface RawFactureDetail extends RawFacture {
  taux_tva: string | number
  commentaire: string
  signature: string | null
  lignes: RawLigneFacture[]
}

const n = (v: string | number) => (typeof v === 'number' ? v : Number.parseFloat(v))

function mapLigne(raw: RawLigneFacture): LigneFacture {
  return {
    id: raw.id_ligne,
    facture: raw.facture,
    description: raw.description,
    quantite: raw.quantite === null ? null : n(raw.quantite),
    prixUnitaire: raw.prix_unitaire === null ? null : n(raw.prix_unitaire),
    montant: n(raw.montant),
  }
}

function mapFacture(raw: RawFacture): Facture {
  return {
    id: raw.id_facture,
    numeroFacture: raw.numero_facture,
    affaire: raw.affaire,
    numeroAffaire: raw.numero_affaire,
    numeroDevis: raw.numero_devis,
    objet: raw.objet,
    client: { id: raw.client.id_client, raisonSociale: raw.client.raison_sociale, email: raw.client.email },
    statut: raw.statut,
    dateFacture: raw.date_facture,
    dateEcheance: raw.date_echeance,
    modeReglement: raw.mode_reglement,
    typeEcheance: raw.type_echeance,
    nombreJours: raw.nombre_jours,
    jourFixeMoisSuivant: raw.jour_fixe_mois_suivant,
    labelEcheance: raw.label_echeance,
    sousTotal: n(raw.sous_total),
    montantTva: n(raw.montant_tva),
    montantTotal: n(raw.montant_total),
    montantAPayer: n(raw.montant_a_payer),
    dateCreation: raw.date_creation,
    dateModification: raw.date_modification,
  }
}

function mapDetail(raw: RawFactureDetail): FactureDetail {
  return {
    ...mapFacture(raw),
    tauxTva: n(raw.taux_tva),
    commentaire: raw.commentaire,
    signature: raw.signature,
    lignes: raw.lignes.map(mapLigne),
  }
}

export interface EcheancePayload {
  typeEcheance: TypeEcheance
  nombreJours?: number | null
  jourFixeMoisSuivant?: number | null
}

export interface FactureUpdatePayload extends EcheancePayload {
  statut?: FactureStatut
  dateFacture?: string
  modeReglement?: ModeReglement
  tauxTva?: number
  commentaire?: string
}

function toFactureApiPayload(p: Partial<FactureUpdatePayload>) {
  return {
    ...(p.statut !== undefined ? { statut: p.statut } : {}),
    ...(p.dateFacture !== undefined ? { date_facture: p.dateFacture } : {}),
    ...(p.modeReglement !== undefined ? { mode_reglement: p.modeReglement } : {}),
    ...(p.typeEcheance !== undefined ? { type_echeance: p.typeEcheance } : {}),
    ...(p.nombreJours !== undefined ? { nombre_jours: p.nombreJours } : {}),
    ...(p.jourFixeMoisSuivant !== undefined ? { jour_fixe_mois_suivant: p.jourFixeMoisSuivant } : {}),
    ...(p.tauxTva !== undefined ? { taux_tva: p.tauxTva } : {}),
    ...(p.commentaire !== undefined ? { commentaire: p.commentaire } : {}),
  }
}

export interface LigneFacturePayload {
  description: string
  quantite?: number | null
  prixUnitaire?: number | null
  montant?: number | null
}

async function telechargerFichier(chemin: string, nomFichier: string, messageErreur: string): Promise<void> {
  const { accessToken } = useAuthStore.getState()
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${chemin}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
  } catch {
    throw new ApiHttpError('Impossible de contacter le serveur. Vérifie que le backend est démarré.', 0)
  }
  if (!response.ok) {
    throw new ApiHttpError(messageErreur, response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
}

export const facturesService = {
  list: (): Promise<Facture[]> => apiFetch<RawFacture[]>('/api/factures/').then((rows) => rows.map(mapFacture)),

  getById: (id: string): Promise<FactureDetail> => apiFetch<RawFactureDetail>(`/api/factures/${id}/`).then(mapDetail),

  createFromAffaire: (affaireId: string, echeance: EcheancePayload): Promise<FactureDetail> =>
    apiFetch<RawFactureDetail>('/api/factures/', {
      method: 'POST',
      body: JSON.stringify({
        affaire: affaireId,
        type_echeance: echeance.typeEcheance,
        nombre_jours: echeance.nombreJours ?? null,
        jour_fixe_mois_suivant: echeance.jourFixeMoisSuivant ?? null,
      }),
    }).then(mapDetail),

  update: (id: string, payload: Partial<FactureUpdatePayload>): Promise<FactureDetail> =>
    apiFetch<RawFactureDetail>(`/api/factures/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toFactureApiPayload(payload)),
    }).then(mapDetail),

  addLigne: (factureId: string, payload: LigneFacturePayload): Promise<LigneFacture> =>
    apiFetch<RawLigneFacture>(`/api/factures/${factureId}/lignes/`, {
      method: 'POST',
      body: JSON.stringify({
        description: payload.description,
        quantite: payload.quantite ?? null,
        prix_unitaire: payload.prixUnitaire ?? null,
        ...(payload.montant !== undefined && payload.montant !== null ? { montant: payload.montant } : {}),
      }),
    }).then(mapLigne),

  removeLigne: (ligneId: string): Promise<void> =>
    apiFetch<void>(`/api/factures/lignes/${ligneId}/`, { method: 'DELETE' }),

  uploadSignature: async (factureId: string, fichier: File): Promise<FactureDetail> => {
    const { accessToken } = useAuthStore.getState()
    const formData = new FormData()
    formData.append('signature', fichier)

    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/api/factures/${factureId}/signature/`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      })
    } catch {
      throw new ApiHttpError('Impossible de contacter le serveur. Vérifie que le backend est démarré.', 0)
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiHttpError(data?.detail ?? "Impossible d'ajouter la signature.", response.status)
    }
    return mapDetail(data)
  },

  downloadPdf: (id: string, nomFichier: string): Promise<void> =>
    telechargerFichier(`/api/factures/${id}/pdf/`, nomFichier, 'Impossible de générer le PDF de cette facture.'),

  downloadXlsx: (id: string, nomFichier: string): Promise<void> =>
    telechargerFichier(`/api/factures/${id}/xlsx/`, nomFichier, 'Impossible de générer le fichier Excel de cette facture.'),
}
