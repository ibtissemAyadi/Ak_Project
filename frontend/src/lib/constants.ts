export const COMPANY_NAME = 'A&K conseil et ingénierie'

// Base URL of the real Django backend. Configured via VITE_API_URL
// (see .env.example) — never hardcode a deployment URL here.
// Trailing slash(es) stripped defensively: a misconfigured env var with
// a trailing "/" would otherwise produce "//api/..." and 404 on Django.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export const CURRENCY = 'EUR'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export const QUOTATION_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  draft: { label: 'Brouillon', variant: 'muted' },
  sent: { label: 'Envoyé', variant: 'info' },
  under_review: { label: 'En cours de revue', variant: 'warning' },
  accepted: { label: 'Accepté', variant: 'success' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
  expired: { label: 'Expiré', variant: 'secondary' },
}

export const DEVIS_STATUT_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  Brouillon: { label: 'Brouillon', variant: 'muted' },
  En_preparation: { label: 'En préparation', variant: 'secondary' },
  A_valider: { label: 'À valider', variant: 'warning' },
  Envoye: { label: 'Envoyé', variant: 'info' },
  Accepte: { label: 'Accepté', variant: 'success' },
  Refuse: { label: 'Refusé', variant: 'destructive' },
  Annule: { label: 'Annulé', variant: 'secondary' },
}

export const AFFAIRE_PRIORITE_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  Basse: { label: 'Basse', variant: 'muted' },
  Normale: { label: 'Normale', variant: 'info' },
  Haute: { label: 'Haute', variant: 'warning' },
  Critique: { label: 'Critique', variant: 'destructive' },
}

export const FACTURE_STATUT_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  Brouillon: { label: 'Brouillon', variant: 'muted' },
  Envoyee: { label: 'Envoyée', variant: 'info' },
  Payee: { label: 'Payée', variant: 'success' },
  Partiellement_payee: { label: 'Partiellement payée', variant: 'warning' },
  En_retard: { label: 'En retard', variant: 'destructive' },
  Annulee: { label: 'Annulée', variant: 'secondary' },
}

export const MODE_REGLEMENT_LABELS: Record<string, string> = {
  virement: 'Virement bancaire',
  cheque: 'Chèque',
  especes: 'Espèces',
  carte: 'Carte bancaire',
  prelevement: 'Prélèvement automatique',
}


export const PROJECT_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  planning: { label: 'Planification', variant: 'secondary' },
  in_progress: { label: 'En cours', variant: 'info' },
  on_hold: { label: 'En pause', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
}

export const PROJECT_PRIORITY_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  low: { label: 'Basse', variant: 'muted' },
  medium: { label: 'Moyenne', variant: 'info' },
  high: { label: 'Haute', variant: 'warning' },
  critical: { label: 'Critique', variant: 'destructive' },
}

export const INVOICE_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  draft: { label: 'Brouillon', variant: 'muted' },
  sent: { label: 'Envoyée', variant: 'info' },
  paid: { label: 'Payée', variant: 'success' },
  partially_paid: { label: 'Partiellement payée', variant: 'warning' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'secondary' },
}

export const CLIENT_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  Actif: { label: 'Actif', variant: 'success' },
  Prospect: { label: 'Prospect', variant: 'info' },
  Inactif: { label: 'Inactif', variant: 'muted' },
}

export const NOTIFICATION_CATEGORY_META: Record<string, { label: string }> = {
  quotation: { label: 'Devis' },
  invoice: { label: 'Factures' },
  project: { label: 'Projets' },
  payment: { label: 'Paiements' },
  document: { label: 'Documents' },
  system: { label: 'Système' },
}

export const DOCUMENT_CATEGORY_META: Record<string, { label: string }> = {
  contract: { label: 'Contrats' },
  technical: { label: 'Technique' },
  financial: { label: 'Financier' },
  legal: { label: 'Juridique' },
  report: { label: 'Rapports' },
  other: { label: 'Autre' },
}

export const USER_ROLE_META: Record<string, { label: string }> = {
  admin: { label: 'Administrateur' },
  manager: { label: 'Chef de projet' },
  engineer: { label: 'Ingénieur' },
  accountant: { label: 'Comptable' },
  sales: { label: 'Commercial' },
}

// ---------- Real backend permission matrix (Administration module) ----------
// Keys match exactly what Django's Role.permissions JSON uses.

export const PERMISSION_MODULES = [
  'clients',
  'devis',
  'affaires',
  'factures',
  'paiements',
  'relances',
  'documents',
  'utilisateurs',
] as const

export const PERMISSION_MODULE_LABELS: Record<(typeof PERMISSION_MODULES)[number], string> = {
  clients: 'Clients',
  devis: 'Devis',
  affaires: 'Affaires',
  factures: 'Factures',
  paiements: 'Paiements',
  relances: 'Relances',
  documents: 'Documents',
  utilisateurs: 'Utilisateurs',
}

export const PERMISSION_ACTIONS = ['lecture', 'creation', 'modification', 'suppression', 'validation'] as const

export const PERMISSION_ACTION_LABELS: Record<(typeof PERMISSION_ACTIONS)[number], string> = {
  lecture: 'Lecture',
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
  validation: 'Validation',
}
