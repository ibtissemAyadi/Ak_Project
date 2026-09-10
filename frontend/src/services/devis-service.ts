import { apiFetch, ApiHttpError } from '@/lib/api-http'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import type {
  Devis,
  DevisCommentaire,
  DevisHistoriqueStatut,
  DevisIntervenant,
  DevisLigne,
  DevisListItem,
  DevisStatut,
  DevisTypeValeur,
} from '@/types'

// ---------------------------------------------------------------------------
// Raw (snake_case) shapes returned by Django — mirrors devis/serializers.py
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

interface RawLigne {
  id_ligne: string
  devis: string
  description: string
  quantite: string | number | null
  prix_unitaire: string | number | null
  montant: string | number
}

interface RawHistorique {
  id_historique: string
  ancien_statut: string
  nouveau_statut: DevisStatut
  utilisateur: string | null
  utilisateur_nom: string | null
  date: string
  commentaire: string
}

interface RawDevisListItem {
  id_devis: string
  numero: string
  version: number
  est_courante: boolean
  client: RawClientMini
  charge_affaires: RawUtilisateurMini
  objet: string
  statut: DevisStatut
  montant_ht: string | number
  montant_tva: string | number
  montant_ttc: string | number
  date_creation: string
  date_validite: string | null
}

interface RawCommentaire {
  id_commentaire: string
  devis: string
  auteur: string
  auteur_nom: string
  texte: string
  date_creation: string
}

export interface RawDevisDetail extends RawDevisListItem {
  transitions_possibles: DevisStatut[]
  affaire_id: string | null
  taux_tva_defaut: string | number
  type_marge: DevisTypeValeur
  valeur_marge: string | number
  type_remise: DevisTypeValeur
  valeur_remise: string | number
  commentaire_justification: string
  sous_total: string | number
  montant_marge: string | number
  montant_remise: string | number
  date_modification: string
  lignes: RawLigne[]
  historique_statuts: RawHistorique[]
  commentaires: RawCommentaire[]
}

const n = (v: string | number) => (typeof v === 'number' ? v : Number.parseFloat(v))

function mapLigne(raw: RawLigne): DevisLigne {
  return {
    id: raw.id_ligne,
    devis: raw.devis,
    description: raw.description,
    quantite: raw.quantite === null ? null : n(raw.quantite),
    prixUnitaire: raw.prix_unitaire === null ? null : n(raw.prix_unitaire),
    montant: n(raw.montant),
  }
}

function mapHistorique(raw: RawHistorique): DevisHistoriqueStatut {
  return {
    id: raw.id_historique,
    ancienStatut: raw.ancien_statut,
    nouveauStatut: raw.nouveau_statut,
    utilisateur: raw.utilisateur,
    utilisateurNom: raw.utilisateur_nom,
    date: raw.date,
    commentaire: raw.commentaire,
  }
}

function mapCommentaire(raw: RawCommentaire): DevisCommentaire {
  return {
    id: raw.id_commentaire,
    devis: raw.devis,
    auteur: raw.auteur,
    auteurNom: raw.auteur_nom,
    texte: raw.texte,
    dateCreation: raw.date_creation,
  }
}

function mapListItem(raw: RawDevisListItem): DevisListItem {
  return {
    id: raw.id_devis,
    numero: raw.numero,
    version: raw.version,
    estCourante: raw.est_courante,
    client: { id: raw.client.id_client, raisonSociale: raw.client.raison_sociale },
    chargeAffaires: {
      id: raw.charge_affaires.id_utilisateur,
      nom: raw.charge_affaires.nom,
      prenom: raw.charge_affaires.prenom,
      coutHoraire: n(raw.charge_affaires.cout_horaire),
    },
    objet: raw.objet,
    statut: raw.statut,
    montantHt: n(raw.montant_ht),
    montantTva: n(raw.montant_tva),
    montantTtc: n(raw.montant_ttc),
    dateCreation: raw.date_creation,
    dateValidite: raw.date_validite,
  }
}

export function mapDevisDetail(raw: RawDevisDetail): Devis {
  return {
    ...mapListItem(raw),
    transitionsPossibles: raw.transitions_possibles,
    affaireId: raw.affaire_id,
    tauxTvaDefaut: n(raw.taux_tva_defaut),
    typeMarge: raw.type_marge,
    valeurMarge: n(raw.valeur_marge),
    typeRemise: raw.type_remise,
    valeurRemise: n(raw.valeur_remise),
    commentaireJustification: raw.commentaire_justification,
    sousTotal: n(raw.sous_total),
    montantMarge: n(raw.montant_marge),
    montantRemise: n(raw.montant_remise),
    dateModification: raw.date_modification,
    lignes: raw.lignes.map(mapLigne),
    historiqueStatuts: raw.historique_statuts.map(mapHistorique),
    commentaires: raw.commentaires.map(mapCommentaire),
  }
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface DevisCreatePayload {
  client: string
  chargeAffaires: string
  objet: string
  tauxTvaDefaut?: number
  typeMarge?: DevisTypeValeur
  valeurMarge?: number
  typeRemise?: DevisTypeValeur
  valeurRemise?: number
  commentaireJustification?: string
  dateValidite?: string
}

function toDevisApiPayload(p: Partial<DevisCreatePayload>) {
  return {
    ...(p.client !== undefined ? { client: p.client } : {}),
    ...(p.chargeAffaires !== undefined ? { charge_affaires: p.chargeAffaires } : {}),
    ...(p.objet !== undefined ? { objet: p.objet } : {}),
    ...(p.tauxTvaDefaut !== undefined ? { taux_tva_defaut: p.tauxTvaDefaut } : {}),
    ...(p.typeMarge !== undefined ? { type_marge: p.typeMarge } : {}),
    ...(p.valeurMarge !== undefined ? { valeur_marge: p.valeurMarge } : {}),
    ...(p.typeRemise !== undefined ? { type_remise: p.typeRemise } : {}),
    ...(p.valeurRemise !== undefined ? { valeur_remise: p.valeurRemise } : {}),
    ...(p.commentaireJustification !== undefined ? { commentaire_justification: p.commentaireJustification } : {}),
    ...(p.dateValidite !== undefined ? { date_validite: p.dateValidite } : {}),
  }
}

export interface LignePayload {
  description: string
  quantite?: number | null
  prixUnitaire?: number | null
  // Utilisé seulement quand quantite/prixUnitaire sont absents (forfait) —
  // sinon le backend recalcule toujours montant = quantite × prixUnitaire.
  montant?: number | null
}

export const devisService = {
  list: (): Promise<DevisListItem[]> => apiFetch<RawDevisListItem[]>('/api/devis/').then((rows) => rows.map(mapListItem)),

  getById: (id: string): Promise<Devis> => apiFetch<RawDevisDetail>(`/api/devis/${id}/`).then(mapDevisDetail),

  create: (payload: DevisCreatePayload): Promise<Devis> =>
    apiFetch<RawDevisDetail>('/api/devis/', {
      method: 'POST',
      body: JSON.stringify(toDevisApiPayload(payload)),
    }).then(mapDevisDetail),

  update: (id: string, payload: Partial<DevisCreatePayload>): Promise<Devis> =>
    apiFetch<RawDevisDetail>(`/api/devis/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toDevisApiPayload(payload)),
    }).then(mapDevisDetail),

  versions: (id: string): Promise<DevisListItem[]> =>
    apiFetch<RawDevisListItem[]>(`/api/devis/${id}/versions/`).then((rows) => rows.map(mapListItem)),

  transition: (id: string, nouveauStatut: DevisStatut, commentaire?: string): Promise<Devis> =>
    apiFetch<RawDevisDetail>(`/api/devis/${id}/transition/`, {
      method: 'POST',
      body: JSON.stringify({ nouveau_statut: nouveauStatut, commentaire: commentaire ?? '' }),
    }).then(mapDevisDetail),

  intervenants: (): Promise<DevisIntervenant[]> =>
    apiFetch<RawUtilisateurMini[]>('/api/devis/intervenants/').then((rows) =>
      rows.map((r) => ({ id: r.id_utilisateur, nom: r.nom, prenom: r.prenom, coutHoraire: n(r.cout_horaire) })),
    ),

  addLigne: (devisId: string, payload: LignePayload): Promise<DevisLigne> =>
    apiFetch<RawLigne>(`/api/devis/${devisId}/lignes/`, {
      method: 'POST',
      body: JSON.stringify({
        description: payload.description,
        quantite: payload.quantite ?? null,
        prix_unitaire: payload.prixUnitaire ?? null,
        ...(payload.montant !== undefined && payload.montant !== null ? { montant: payload.montant } : {}),
      }),
    }).then(mapLigne),

  removeLigne: (ligneId: string): Promise<void> =>
    apiFetch<void>(`/api/devis/lignes/${ligneId}/`, { method: 'DELETE' }),

  addCommentaire: (devisId: string, texte: string): Promise<DevisCommentaire> =>
    apiFetch<RawCommentaire>(`/api/devis/${devisId}/commentaires/`, {
      method: 'POST',
      body: JSON.stringify({ texte }),
    }).then(mapCommentaire),

  downloadPdf: (id: string, nomFichier: string): Promise<void> =>
    telechargerFichier(`/api/devis/${id}/pdf/`, nomFichier, 'Impossible de générer le PDF de ce devis.'),

  downloadXlsx: (id: string, nomFichier: string): Promise<void> =>
    telechargerFichier(`/api/devis/${id}/xlsx/`, nomFichier, 'Impossible de générer le fichier Excel de ce devis.'),
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
