import { CURRENCY } from '@/lib/constants'
import { activitesService } from '@/services/activites-service'
import { facturesService } from '@/services/factures-service'
import { MOCK_PAYMENT_REMINDERS } from '@/mocks/data/payments'
import { withLatency } from '@/lib/api-client'
import type { Facture, Payment } from '@/types'

// Il n'existe pas de module Paiements côté backend (pas de suivi ligne par
// ligne des règlements) : un « paiement » ici est simplement une facture,
// vue sous l'angle de l'argent dû/reçu — toutes les factures apparaissent,
// quel que soit leur statut (payée ou non, voir Payment.status = le vrai
// statut de la facture). La date est sa dernière modification (proxy le
// plus honnête disponible pour « quand ce statut a changé », faute d'un
// champ dédié côté Facture).
function facturePaiement(f: Facture): Payment {
  return {
    id: f.id,
    reference: f.numeroFacture,
    invoiceId: f.id,
    invoiceReference: f.numeroFacture,
    clientId: f.client.id,
    clientName: f.client.raisonSociale,
    clientEmail: f.client.email,
    amount: f.montantTotal,
    currency: CURRENCY,
    method: f.modeReglement,
    status: f.statut,
    dueDate: f.dateEcheance,
    paidAt: f.dateModification,
  }
}

export const paymentsService = {
  // Les factures Brouillon ne sont jamais parties au client : les exclure
  // évite d'afficher des "paiements" pour quelque chose qu'il n'a même pas
  // encore reçu.
  list: async (): Promise<Payment[]> => {
    const factures = await facturesService.list()
    return factures
      .filter((f) => f.statut !== 'Brouillon')
      .map(facturePaiement)
      .sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))
  },

  getById: async (id: string): Promise<Payment> => {
    const facture = await facturesService.getById(id)
    return facturePaiement(facture)
  },

  // Chronologie réelle : les activités enregistrées pour cette facture
  // (création, changements de statut...) — voir activites-service.ts.
  getTimeline: (invoiceReference: string) => activitesService.listByCible(invoiceReference),

  // Les relances automatiques (email/SMS avant échéance) n'ont pas
  // d'équivalent backend (aucun envoi réel n'est déclenché) : reste simulé.
  listReminders: () => withLatency(() => [...MOCK_PAYMENT_REMINDERS]),
}
