import { apiFetch, ApiHttpError } from '@/lib/api-http'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import { mapDevisDetail, type RawDevisDetail } from '@/services/devis-service'
import type { Affaire, AffaireCommentaire, AffaireDetail, AffairePriorite, PieceJointeAffaire, RevenuePoint } from '@/types'

// ---------------------------------------------------------------------------
// Raw (snake_case) shapes returned by Django — mirrors affaires/serializers.py
// ---------------------------------------------------------------------------

interface RawClientMini {
  id_client: string
  raison_sociale: string
}

interface RawUtilisateurMini {
  id_utilisateur: string
  nom: string
  prenom: string
  cout_horaire: string | number
}

interface RawAffaire {
  id_affaire: string
  numero_affaire: string
  devis: string
  devis_numero: string
  objet: string
  client: RawClientMini
  charge_affaires: RawUtilisateurMini
  budget: string | number
  heures_prevues: string | number
  heures_consommees: string | number
  heures_restantes: string | number
  etat_avancement: number
  priorite: AffairePriorite
  date_debut: string | null
  date_fin_prevue: string | null
  date_fin_reelle: string | null
  date_creation: string
}

interface RawAffaireDetail extends RawAffaire {
  date_modification: string
  commentaires: RawCommentaire[]
  pieces_jointes: RawPieceJointe[]
  facture_id: string | null
  devis_detail: RawDevisDetail
}

interface RawCommentaire {
  id_commentaire: string
  affaire: string
  auteur: string
  auteur_nom: string
  texte: string
  date_creation: string
}

interface RawPieceJointe {
  id_piece: string
  affaire: string
  designation: string
  fichier: string
  ajoute_par: string | null
  ajoute_par_nom: string | null
  date_ajout: string
}

const n = (v: string | number) => (typeof v === 'number' ? v : Number.parseFloat(v))

function mapAffaire(raw: RawAffaire): Affaire {
  return {
    id: raw.id_affaire,
    numeroAffaire: raw.numero_affaire,
    devis: raw.devis,
    devisNumero: raw.devis_numero,
    objet: raw.objet,
    client: { id: raw.client.id_client, raisonSociale: raw.client.raison_sociale },
    chargeAffaires: {
      id: raw.charge_affaires.id_utilisateur,
      nom: raw.charge_affaires.nom,
      prenom: raw.charge_affaires.prenom,
      coutHoraire: n(raw.charge_affaires.cout_horaire),
    },
    budget: n(raw.budget),
    heuresPrevues: n(raw.heures_prevues),
    heuresConsommees: n(raw.heures_consommees),
    heuresRestantes: n(raw.heures_restantes),
    etatAvancement: raw.etat_avancement,
    priorite: raw.priorite,
    dateDebut: raw.date_debut,
    dateFinPrevue: raw.date_fin_prevue,
    dateFinReelle: raw.date_fin_reelle,
    dateCreation: raw.date_creation,
  }
}

function mapCommentaire(raw: RawCommentaire): AffaireCommentaire {
  return {
    id: raw.id_commentaire,
    affaire: raw.affaire,
    auteur: raw.auteur,
    auteurNom: raw.auteur_nom,
    texte: raw.texte,
    dateCreation: raw.date_creation,
  }
}

function mapPieceJointe(raw: RawPieceJointe): PieceJointeAffaire {
  return {
    id: raw.id_piece,
    affaire: raw.affaire,
    designation: raw.designation,
    fichierUrl: raw.fichier,
    ajoutePar: raw.ajoute_par,
    ajouteParNom: raw.ajoute_par_nom,
    dateAjout: raw.date_ajout,
  }
}

function mapDetail(raw: RawAffaireDetail): AffaireDetail {
  return {
    ...mapAffaire(raw),
    dateModification: raw.date_modification,
    commentaires: raw.commentaires.map(mapCommentaire),
    piecesJointes: raw.pieces_jointes.map(mapPieceJointe),
    factureId: raw.facture_id,
    devisDetail: mapDevisDetail(raw.devis_detail),
  }
}

export interface AffaireUpdatePayload {
  budget?: number
  heuresPrevues?: number
  heuresConsommees?: number
  etatAvancement?: number
  priorite?: AffairePriorite
  dateDebut?: string
  dateFinPrevue?: string
  dateFinReelle?: string
}

function toAffaireApiPayload(p: Partial<AffaireUpdatePayload>) {
  return {
    ...(p.budget !== undefined ? { budget: p.budget } : {}),
    ...(p.heuresPrevues !== undefined ? { heures_prevues: p.heuresPrevues } : {}),
    ...(p.heuresConsommees !== undefined ? { heures_consommees: p.heuresConsommees } : {}),
    ...(p.etatAvancement !== undefined ? { etat_avancement: p.etatAvancement } : {}),
    ...(p.priorite !== undefined ? { priorite: p.priorite } : {}),
    ...(p.dateDebut !== undefined ? { date_debut: p.dateDebut || null } : {}),
    ...(p.dateFinPrevue !== undefined ? { date_fin_prevue: p.dateFinPrevue || null } : {}),
    ...(p.dateFinReelle !== undefined ? { date_fin_reelle: p.dateFinReelle || null } : {}),
  }
}

interface RawPrevisionRevenus {
  mois: string // 'YYYY-MM'
  montant_prevu: string | number
}

function mapPrevisionRevenus(raw: RawPrevisionRevenus): RevenuePoint {
  const [annee, mois] = raw.mois.split('-').map(Number)
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(new Date(annee, mois - 1, 1))
  return { month: label, revenue: n(raw.montant_prevu) }
}

export const affairesService = {
  list: (): Promise<Affaire[]> => apiFetch<RawAffaire[]>('/api/affaires/').then((rows) => rows.map(mapAffaire)),

  previsionRevenus: (mois = 12, chargeAffairesId?: string): Promise<RevenuePoint[]> =>
    apiFetch<RawPrevisionRevenus[]>(
      `/api/affaires/prevision-revenus/?mois=${mois}${chargeAffairesId ? `&charge_affaires=${chargeAffairesId}` : ''}`,
    ).then((rows) => rows.map(mapPrevisionRevenus)),

  montantEnAttente: (chargeAffairesId?: string): Promise<number> =>
    apiFetch<{ montant_en_attente: string | number }>(
      `/api/affaires/montant-en-attente/${chargeAffairesId ? `?charge_affaires=${chargeAffairesId}` : ''}`,
    ).then((r) => n(r.montant_en_attente)),

  getById: (id: string): Promise<AffaireDetail> => apiFetch<RawAffaireDetail>(`/api/affaires/${id}/`).then(mapDetail),

  update: (id: string, payload: Partial<AffaireUpdatePayload>): Promise<AffaireDetail> =>
    apiFetch<RawAffaireDetail>(`/api/affaires/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toAffaireApiPayload(payload)),
    }).then(mapDetail),

  addCommentaire: (affaireId: string, texte: string): Promise<AffaireCommentaire> =>
    apiFetch<RawCommentaire>(`/api/affaires/${affaireId}/commentaires/`, {
      method: 'POST',
      body: JSON.stringify({ texte }),
    }).then(mapCommentaire),

  uploadPieceJointe: async (affaireId: string, designation: string, fichier: File): Promise<PieceJointeAffaire> => {
    const { accessToken } = useAuthStore.getState()
    const formData = new FormData()
    formData.append('designation', designation)
    formData.append('fichier', fichier)

    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/api/affaires/${affaireId}/pieces-jointes/`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      })
    } catch {
      throw new ApiHttpError('Impossible de contacter le serveur. Vérifie que le backend est démarré.', 0)
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiHttpError(data?.detail ?? "Impossible d'ajouter la pièce jointe.", response.status)
    }
    return mapPieceJointe(data)
  },

  removePieceJointe: (pieceId: string): Promise<void> =>
    apiFetch<void>(`/api/affaires/pieces-jointes/${pieceId}/`, { method: 'DELETE' }),
}
