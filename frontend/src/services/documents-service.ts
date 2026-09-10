import { apiFetch, ApiHttpError } from '@/lib/api-http'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import { devisService } from '@/services/devis-service'
import { facturesService } from '@/services/factures-service'
import type { AppDocument, DocumentCategory } from '@/types'

interface RawDocument {
  id_document: string
  designation: string
  categorie: DocumentCategory
  fichier: string
  lie_a: string
  ajoute_par: string | null
  ajoute_par_nom: string | null
  taille_ko: number
  date_creation: string
}

function mapDocument(raw: RawDocument): AppDocument {
  const extension = raw.fichier.split('.').pop()?.toLowerCase() ?? 'fichier'
  return {
    id: `doc-${raw.id_document}`,
    sourceId: raw.id_document,
    source: 'upload',
    name: raw.designation,
    category: raw.categorie,
    fileType: extension,
    sizeKb: raw.taille_ko,
    relatedTo: raw.lie_a || null,
    ownerName: raw.ajoute_par_nom ?? 'Inconnu',
    createdAt: raw.date_creation,
    downloadUrl: raw.fichier,
  }
}

export const documentsService = {
  // Bibliothèque unifiée : vrais fichiers importés + PDF de devis/factures
  // générés à la volée — trois sources réelles, aucun mock.
  list: async (): Promise<AppDocument[]> => {
    const [documents, devis, factures] = await Promise.all([
      apiFetch<RawDocument[]>('/api/documents/').then((rows) => rows.map(mapDocument)),
      devisService.list(),
      facturesService.list(),
    ])

    const devisDocuments: AppDocument[] = devis.map((d) => ({
      id: `devis-${d.id}`,
      sourceId: d.id,
      source: 'devis',
      name: `Devis ${d.numero}`,
      category: 'contract',
      fileType: 'pdf',
      sizeKb: null,
      relatedTo: d.client.raisonSociale,
      ownerName: `${d.chargeAffaires.prenom} ${d.chargeAffaires.nom}`,
      createdAt: d.dateCreation,
      downloadUrl: null,
    }))

    const facturesDocuments: AppDocument[] = factures.map((f) => ({
      id: `facture-${f.id}`,
      sourceId: f.id,
      source: 'facture',
      name: `Facture ${f.numeroFacture}`,
      category: 'financial',
      fileType: 'pdf',
      sizeKb: null,
      relatedTo: f.client.raisonSociale,
      ownerName: f.client.raisonSociale,
      createdAt: f.dateCreation,
      downloadUrl: null,
    }))

    return [...documents, ...devisDocuments, ...facturesDocuments].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },

  upload: async (payload: { designation: string; categorie: DocumentCategory; fichier: File; lieA?: string }): Promise<AppDocument> => {
    const { accessToken } = useAuthStore.getState()
    const formData = new FormData()
    formData.append('designation', payload.designation)
    formData.append('categorie', payload.categorie)
    formData.append('fichier', payload.fichier)
    if (payload.lieA) formData.append('lie_a', payload.lieA)

    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/api/documents/`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      })
    } catch {
      throw new ApiHttpError('Impossible de contacter le serveur. Vérifie que le backend est démarré.', 0)
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiHttpError(data?.detail ?? "Impossible d'importer le document.", response.status)
    }
    return mapDocument(data)
  },

  remove: (doc: AppDocument): Promise<void> => apiFetch<void>(`/api/documents/${doc.sourceId}/`, { method: 'DELETE' }),

  // Devis/facture : pas de fichier stocké, on redéclenche la génération PDF
  // existante (déjà utilisée par les modules Devis/Factures) et on force le
  // téléchargement dans le navigateur.
  downloadPdf: (doc: AppDocument): Promise<void> => {
    if (doc.source === 'devis') return devisService.downloadPdf(doc.sourceId, `${doc.name}.pdf`)
    if (doc.source === 'facture') return facturesService.downloadPdf(doc.sourceId, `${doc.name}.pdf`)
    return Promise.reject(new Error('Ce document ne peut pas être téléchargé via cette méthode.'))
  },
}
