import type { ChatConversation } from '@/types'
import { daysFromNow } from '@/mocks/generators'

export const SUGGESTED_PROMPTS = [
  'Résumer les factures en retard ce mois-ci',
  'Quels projets risquent de manquer leur échéance ?',
  'Rédiger un email de relance pour un devis en attente',
  "Montrer les clients sans activité depuis 60 jours",
]

export const MOCK_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-1',
    title: 'Overdue invoices summary',
    updatedAt: daysFromNow(-1),
    messages: [
      {
        id: 'm-1',
        role: 'user',
        content: 'Can you summarize which invoices are overdue right now?',
        createdAt: daysFromNow(-1.02),
      },
      {
        id: 'm-2',
        role: 'assistant',
        content:
          'You currently have several overdue invoices, mostly concentrated with clients in the construction and energy sectors. The largest is INV-5012 for Atlas Construction Group, 6 days overdue. Would you like me to draft reminder emails for the top 3?',
        createdAt: daysFromNow(-1.01),
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Project risk check',
    updatedAt: daysFromNow(-3),
    messages: [
      {
        id: 'm-3',
        role: 'user',
        content: 'Which of our in-progress projects are at risk of missing their deadline?',
        createdAt: daysFromNow(-3.05),
      },
      {
        id: 'm-4',
        role: 'assistant',
        content:
          'Based on current progress vs. timeline, "Bridge Deck Replacement" and "Metro Line Extension Study" are trending behind schedule. Both have less than 40% progress with under 30% of their timeline remaining.',
        createdAt: daysFromNow(-3.04),
      },
    ],
  },
]

export function buildAssistantReply(prompt: string): string {
  const normalized = prompt.toLowerCase()
  if (normalized.includes('overdue') || normalized.includes('invoice') || normalized.includes('retard') || normalized.includes('facture')) {
    return "Voici un aperçu rapide de vos créances : les factures en retard sont concentrées sur 2-3 comptes. Je peux préparer des relances ou exporter une liste si cela peut aider."
  }
  if (normalized.includes('project') || normalized.includes('deadline') || normalized.includes('projet') || normalized.includes('échéance')) {
    return "En comparant l'avancement au planning prévu, quelques projets accusent du retard. Je recommande un point de statut avec leurs chefs de projet cette semaine."
  }
  if (normalized.includes('quotation') || normalized.includes('email') || normalized.includes('devis') || normalized.includes('relance')) {
    return 'Bien sûr — voici un brouillon : « Bonjour, je me permets de revenir vers vous concernant le devis transmis afin de savoir si vous aviez des questions avant de poursuivre. Disponible pour un appel cette semaine. »'
  }
  if (normalized.includes('client') || normalized.includes('activité')) {
    return "Quelques comptes n'ont enregistré aucune activité depuis 60 jours. Je peux les signaler aux chargés d'affaires concernés pour une relance."
  }
  return "C'est noté. Je pourrai m'appuyer sur les données du CRM, des Devis, des Projets, des Factures et des Paiements pour répondre à ce type de question une fois connecté aux données réelles."
}
