import { activitesService } from '@/services/activites-service'
import { affairesService } from '@/services/affaires-service'
import { devisService } from '@/services/devis-service'
import { facturesService } from '@/services/factures-service'
import type { Affaire, DevisListItem, DevisStatut, Facture, KpiSummary, UpcomingDeadline } from '@/types'

export interface DashboardFilters {
  // Filtre "période" : ne s'applique qu'aux enregistrements créés dans cette
  // fenêtre (date_creation) — affaires, devis, factures. Le CA prévisionnel
  // (par nature tourné vers les prochains mois) et le montant en attente
  // (état courant) ne sont pas concernés, seulement par chargeAffairesId.
  from?: string // 'YYYY-MM-DD'
  to?: string
  chargeAffairesId?: string
}

const DEVIS_STATUTS: DevisStatut[] = ['Brouillon', 'En_preparation', 'A_valider', 'Envoye', 'Accepte', 'Refuse', 'Annule']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function dansPeriode(date: string, filters: DashboardFilters) {
  if (filters.from && date < filters.from) return false
  if (filters.to && date > filters.to) return false
  return true
}

function estEnRetard(facture: Facture) {
  return facture.dateEcheance < today() && facture.statut !== 'Payee' && facture.statut !== 'Annulee'
}

function echeancesAffaires(affaires: Affaire[]): UpcomingDeadline[] {
  const aujourdHui = today()
  return affaires
    .filter((a) => a.dateFinReelle === null && a.dateFinPrevue !== null && a.dateFinPrevue >= aujourdHui)
    .map((a) => ({
      id: `affaire-${a.id}`,
      title: a.objet,
      type: 'project' as const,
      dueDate: a.dateFinPrevue as string,
      owner: `${a.chargeAffaires.prenom} ${a.chargeAffaires.nom}`,
    }))
}

function echeancesDevis(devis: DevisListItem[]): UpcomingDeadline[] {
  const aujourdHui = today()
  return devis
    .filter((d) => d.statut === 'Envoye' && d.dateValidite !== null && d.dateValidite >= aujourdHui)
    .map((d) => ({
      id: `devis-${d.id}`,
      title: d.objet,
      type: 'quotation' as const,
      dueDate: d.dateValidite as string,
      owner: `${d.chargeAffaires.prenom} ${d.chargeAffaires.nom}`,
    }))
}

function echeancesFactures(factures: Facture[]): UpcomingDeadline[] {
  const aujourdHui = today()
  return factures
    .filter((f) => f.statut !== 'Payee' && f.statut !== 'Annulee' && f.dateEcheance >= aujourdHui)
    .map((f) => ({
      id: `facture-${f.id}`,
      title: `${f.numeroFacture} - ${f.client.raisonSociale}`,
      type: 'invoice' as const,
      dueDate: f.dateEcheance,
      owner: f.client.raisonSociale,
    }))
}

export const dashboardService = {
  getOverview: async (filters: DashboardFilters = {}) => {
    const [revenue, montantEnAttente, facturesAll, affairesAll, devisAll, recentActivities] = await Promise.all([
      affairesService.previsionRevenus(12, filters.chargeAffairesId),
      affairesService.montantEnAttente(filters.chargeAffairesId),
      facturesService.list(),
      affairesService.list(),
      devisService.list(),
      activitesService.list(10, { utilisateurId: filters.chargeAffairesId, depuis: filters.from, jusqua: filters.to }),
    ])

    // Facture n'a pas de charge_affaires direct : on le retrouve via
    // l'affaire d'origine (sur la liste complète, pas la liste déjà filtrée,
    // pour que l'association reste correcte quelle que soit la date de
    // création de l'affaire elle-même).
    const affaireVersChargeAffaires = new Map(affairesAll.map((a) => [a.id, a.chargeAffaires.id]))

    const affaires = affairesAll.filter(
      (a) =>
        (!filters.chargeAffairesId || a.chargeAffaires.id === filters.chargeAffairesId) &&
        dansPeriode(a.dateCreation.slice(0, 10), filters),
    )
    const devis = devisAll.filter(
      (d) =>
        (!filters.chargeAffairesId || d.chargeAffaires.id === filters.chargeAffairesId) &&
        dansPeriode(d.dateCreation.slice(0, 10), filters),
    )
    const factures = facturesAll.filter(
      (f) =>
        (!filters.chargeAffairesId || affaireVersChargeAffaires.get(f.affaire) === filters.chargeAffairesId) &&
        dansPeriode(f.dateFacture, filters),
    )

    const facturesEnRetard = factures.filter(estEnRetard)
    const projetsEnCours = affaires.filter((a) => a.dateFinReelle === null)
    const projetsEnRetard = projetsEnCours.filter((a) => a.dateFinPrevue !== null && a.dateFinPrevue < today())
    const paiementsEncaisses = factures.filter((f) => f.statut === 'Payee').reduce((sum, f) => sum + f.montantTotal, 0)
    const devisOuverts = devis.filter((d) => d.statut === 'Envoye')
    const devisAValider = devis.filter((d) => d.statut === 'A_valider')

    const kpis: KpiSummary[] = [
      { label: 'Projets actifs', value: projetsEnCours.length, format: 'number' },
      { label: 'Affaires en retard', value: projetsEnRetard.length, format: 'number' },
      { label: 'Devis ouverts', value: devisOuverts.length, format: 'number' },
      { label: 'Devis à valider', value: devisAValider.length, format: 'number' },
      { label: 'Montant en attente', value: montantEnAttente, format: 'currency' },
      { label: 'Paiements encaissés', value: paiementsEncaisses, format: 'currency' },
      { label: 'Factures en retard', value: facturesEnRetard.length, format: 'number' },
    ]

    const quotationsByStatus = DEVIS_STATUTS.map((statut) => ({
      status: statut,
      count: devis.filter((d) => d.statut === statut).length,
    }))

    const upcomingDeadlines = [...echeancesAffaires(affaires), ...echeancesDevis(devis), ...echeancesFactures(factures)]
      .sort((a, b) => (a.dueDate > b.dueDate ? 1 : a.dueDate < b.dueDate ? -1 : 0))
      .slice(0, 8)

    const projectsInProgress = [...projetsEnCours]
      .sort((a, b) => {
        if (a.dateFinPrevue === null) return 1
        if (b.dateFinPrevue === null) return -1
        return a.dateFinPrevue > b.dateFinPrevue ? 1 : -1
      })
      .slice(0, 6)

    return {
      kpis,
      revenue,
      quotationsByStatus,
      lateInvoices: facturesEnRetard.slice(0, 6),
      upcomingDeadlines,
      projectsInProgress,
      recentActivities,
    }
  },
}
