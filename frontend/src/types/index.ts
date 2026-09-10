// Central domain types for the AK Consulting workspace.
// These mirror the shape the future Django REST API is expected to return.

export type Id = string

export type UserRole = 'admin' | 'manager' | 'engineer' | 'accountant' | 'sales'

export interface AppUser {
  id: Id
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  role: UserRole
  department: string
  jobTitle: string
  status: 'active' | 'invited' | 'suspended'
  lastActiveAt: string
  createdAt: string
}

// ---------- Authenticated user (real backend shape) ----------
// Distinct from AppUser (mock business data e.g. project members, account
// managers). This mirrors exactly what POST /api/auth/login/ returns.

export interface AuthRole {
  id: Id
  libelle: string
  permissions: Record<string, Record<string, boolean>>
}

export interface AuthUser {
  id: Id
  nom: string
  prenom: string
  email: string
  role: AuthRole
  statut: 'Actif' | 'Suspendu' | 'Desactive'
  coutHoraire: number
  dateCreation: string
}

export interface Permission {
  id: Id
  key: string
  label: string
  module: string
}

export interface RoleDefinition {
  id: Id
  name: UserRole
  label: string
  description: string
  color: string
  userCount: number
  permissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>
}

// ---------- CRM ----------

export type ClientStatus = 'active' | 'prospect' | 'inactive'
export type ClientType = 'company' | 'individual' | 'government'

export interface Client {
  id: Id
  name: string
  logoUrl?: string
  type: ClientType
  status: ClientStatus
  industry: string
  email: string
  phone: string
  website?: string
  address: string
  city: string
  country: string
  taxId?: string
  accountManagerId: Id
  accountManagerName: string
  tags: string[]
  totalRevenue: number
  openQuotations: number
  activeProjects: number
  createdAt: string
  notes?: string
}

// Real, API-backed CRM client (backend `crm.Client` model) — distinct from
// the mock `Client` above, which the rest of the still-mocked ERP (quotations,
// invoices, projects, command palette…) keeps using for its client picker/name
// fields. Kept separate to avoid a much larger cross-module rewrite.
export type CrmClientStatut = 'Prospect' | 'Actif' | 'Inactif'

export interface CrmClient {
  id: Id
  raisonSociale: string
  matriculeFiscal: string
  adresse: string
  pays: string
  secteurActivite: string
  statut: CrmClientStatut
  telephone: string
  email: string
  dateCreation: string
  dateModification: string
}

// Real, API-backed devis/chiffrage (backend `devis.Devis` model + lines) —
// distinct from the mock `Quotation` used elsewhere (dashboard charts,
// command palette, kanban board), same reasoning as CrmClient above.
export type DevisStatut = 'Brouillon' | 'En_preparation' | 'A_valider' | 'Envoye' | 'Accepte' | 'Refuse' | 'Annule'
export type DevisTypeValeur = 'pourcentage' | 'valeur'

export interface DevisLigne {
  id: Id
  devis: Id
  description: string
  quantite: number | null
  prixUnitaire: number | null
  montant: number
}

export interface DevisHistoriqueStatut {
  id: Id
  ancienStatut: string
  nouveauStatut: DevisStatut
  utilisateur: Id | null
  utilisateurNom: string | null
  date: string
  commentaire: string
}

export interface DevisCommentaire {
  id: Id
  devis: Id
  auteur: Id
  auteurNom: string
  texte: string
  dateCreation: string
}

export interface DevisListItem {
  id: Id
  numero: string
  version: number
  estCourante: boolean
  client: { id: Id; raisonSociale: string }
  chargeAffaires: { id: Id; nom: string; prenom: string; coutHoraire: number }
  objet: string
  statut: DevisStatut
  montantHt: number
  montantTva: number
  montantTtc: number
  dateCreation: string
  dateValidite: string | null
}

export interface Devis extends DevisListItem {
  transitionsPossibles: DevisStatut[]
  affaireId: Id | null
  tauxTvaDefaut: number
  typeMarge: DevisTypeValeur
  valeurMarge: number
  typeRemise: DevisTypeValeur
  valeurRemise: number
  commentaireJustification: string
  sousTotal: number
  montantMarge: number
  montantRemise: number
  dateModification: string
  lignes: DevisLigne[]
  historiqueStatuts: DevisHistoriqueStatut[]
  commentaires: DevisCommentaire[]
}

export interface DevisIntervenant {
  id: Id
  nom: string
  prenom: string
  coutHoraire: number
}

// ---------- Affaires ----------

export type AffairePriorite = 'Basse' | 'Normale' | 'Haute' | 'Critique'

export interface AffaireCommentaire {
  id: Id
  affaire: Id
  auteur: Id
  auteurNom: string
  texte: string
  dateCreation: string
}

export interface PieceJointeAffaire {
  id: Id
  affaire: Id
  designation: string
  fichierUrl: string
  ajoutePar: Id | null
  ajouteParNom: string | null
  dateAjout: string
}

export interface Affaire {
  id: Id
  numeroAffaire: string
  devis: Id
  devisNumero: string
  objet: string
  client: { id: Id; raisonSociale: string }
  chargeAffaires: { id: Id; nom: string; prenom: string; coutHoraire: number }
  budget: number
  heuresPrevues: number
  heuresConsommees: number
  heuresRestantes: number
  etatAvancement: number
  priorite: AffairePriorite
  dateDebut: string | null
  dateFinPrevue: string | null
  dateFinReelle: string | null
  dateCreation: string
}

export interface AffaireDetail extends Affaire {
  dateModification: string
  commentaires: AffaireCommentaire[]
  piecesJointes: PieceJointeAffaire[]
  factureId: Id | null
  // Le devis d'origine complet (lignes, montants, marge/remise, historique...).
  devisDetail: Devis
}

// ---------- Factures ----------

export type FactureStatut = 'Brouillon' | 'Envoyee' | 'Payee' | 'Partiellement_payee' | 'En_retard' | 'Annulee'
export type ModeReglement = 'virement' | 'cheque' | 'especes' | 'carte' | 'prelevement'

// Trois méthodes de calcul de la date d'échéance, mutuellement exclusives —
// voir calculer_date_echeance côté backend (factures/models.py) pour le
// détail exact de chaque méthode.
export type TypeEcheance = 'net' | 'fin_mois' | 'jour_fixe'

export interface LigneFacture {
  id: Id
  facture: Id
  description: string
  quantite: number | null
  prixUnitaire: number | null
  montant: number
}

export interface Facture {
  id: Id
  numeroFacture: string
  affaire: Id
  numeroAffaire: string
  numeroDevis: string
  objet: string
  client: { id: Id; raisonSociale: string; email: string }
  statut: FactureStatut
  dateFacture: string
  dateEcheance: string
  modeReglement: ModeReglement
  typeEcheance: TypeEcheance
  nombreJours: number | null
  jourFixeMoisSuivant: number | null
  labelEcheance: string
  sousTotal: number
  montantTva: number
  montantTotal: number
  montantAPayer: number
  dateCreation: string
  dateModification: string
}

export interface FactureDetail extends Facture {
  tauxTva: number
  commentaire: string
  signature: string | null
  lignes: LigneFacture[]
}

export interface Contact {
  id: Id
  clientId: Id
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  phone: string
  isPrimary: boolean
  avatarUrl?: string
}

export type ClientHistoryType = 'call' | 'email' | 'meeting' | 'quotation' | 'invoice' | 'project' | 'note'

export interface ClientHistoryEntry {
  id: Id
  clientId: Id
  type: ClientHistoryType
  title: string
  description: string
  authorName: string
  createdAt: string
}

// ---------- Quotations ----------

export type QuotationStatus = 'draft' | 'sent' | 'under_review' | 'accepted' | 'rejected' | 'expired'

export interface QuotationLine {
  id: Id
  description: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  discountPct: number
  taxPct: number
}

export interface QuotationVersion {
  id: Id
  version: number
  createdAt: string
  createdBy: string
  changeSummary: string
  total: number
}

export interface Quotation {
  id: Id
  reference: string
  clientId: Id
  clientName: string
  title: string
  status: QuotationStatus
  owner: string
  createdAt: string
  validUntil: string
  currency: string
  lines: QuotationLine[]
  versions: QuotationVersion[]
  currentVersion: number
  notes?: string
}

// ---------- Projects ----------

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ProjectMember {
  id: Id
  userId: Id
  name: string
  role: string
  avatarUrl?: string
  allocationPct: number
}

export interface TimeEntry {
  id: Id
  projectId: Id
  memberName: string
  taskName: string
  date: string
  hours: number
  billable: boolean
  notes?: string
}

export interface ProjectEvent {
  id: Id
  projectId: Id
  type: 'milestone' | 'status_change' | 'comment' | 'document' | 'task'
  title: string
  description: string
  authorName: string
  createdAt: string
}

export interface ProjectAttachment {
  id: Id
  projectId: Id
  name: string
  fileType: string
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
}

export interface ProjectTask {
  id: Id
  title: string
  done: boolean
}

export interface Project {
  id: Id
  reference: string
  name: string
  clientId: Id
  clientName: string
  status: ProjectStatus
  priority: ProjectPriority
  progressPct: number
  managerName: string
  startDate: string
  endDate: string
  budget: number
  spent: number
  description: string
  members: ProjectMember[]
  tasks: ProjectTask[]
}

// ---------- Invoices ----------

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled'

export interface InvoiceLine {
  id: Id
  description: string
  quantity: number
  unitPrice: number
  taxPct: number
}

export interface Invoice {
  id: Id
  reference: string
  clientId: Id
  clientName: string
  projectId?: Id
  projectName?: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  currency: string
  lines: InvoiceLine[]
  amountPaid: number
  notes?: string
}

// ---------- Payments ----------

// Un « paiement » n'est pas une ressource propre côté backend (pas de
// module Paiements réel) : c'est une facture, vue sous l'angle de l'argent
// dû/reçu — les factures Brouillon (jamais envoyées au client) n'apparaissent
// pas ici, ça n'a pas de sens de "relancer" un paiement que le client n'a
// même pas encore reçu. method et status réutilisent donc directement
// ModeReglement et FactureStatut (les vraies valeurs de la facture), pas une
// énumération de paiement inventée qui ne correspondrait à rien de réel
// côté serveur.
export interface Payment {
  id: Id
  reference: string
  invoiceId: Id
  invoiceReference: string
  clientId: Id
  clientName: string
  clientEmail: string
  amount: number
  currency: string
  method: ModeReglement
  status: FactureStatut
  dueDate: string
  paidAt: string
}

export interface PaymentReminder {
  id: Id
  invoiceId: Id
  invoiceReference: string
  clientName: string
  channel: 'email' | 'sms'
  scheduledFor: string
  status: 'scheduled' | 'sent' | 'cancelled'
  template: string
}

// ---------- Documents ----------

export type DocumentCategory = 'contract' | 'technical' | 'financial' | 'legal' | 'report' | 'other'

// 'upload' = vrai fichier importé (module Documents, réellement stocké en
// base). 'devis'/'facture' = PDF généré à la volée par les endpoints déjà
// existants (/api/devis/<id>/pdf/, /api/factures/<id>/pdf/) — pas dupliqué
// en base, juste affiché ici pour une bibliothèque documentaire unifiée.
export type DocumentSource = 'upload' | 'devis' | 'facture'

export interface AppDocument {
  id: Id
  sourceId: Id
  source: DocumentSource
  name: string
  category: DocumentCategory
  fileType: string
  sizeKb: number | null
  relatedTo: string | null
  ownerName: string
  createdAt: string
  // URL directe du fichier réel — seulement pour source === 'upload'. Pour
  // 'devis'/'facture', le téléchargement passe par documentsService.downloadPdf().
  downloadUrl: string | null
}

// ---------- Notifications ----------

export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationCategory = 'quotation' | 'invoice' | 'project' | 'payment' | 'document' | 'system'

export interface AppNotification {
  id: Id
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

// ---------- AI Assistant ----------

export interface ChatMessage {
  id: Id
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ChatConversation {
  id: Id
  title: string
  updatedAt: string
  messages: ChatMessage[]
}

// ---------- Dashboard ----------

export interface KpiSummary {
  label: string
  value: number
  format: 'currency' | 'number' | 'percent'
  deltaPct?: number
  trend?: 'up' | 'down' | 'flat'
}

export interface RevenuePoint {
  month: string
  revenue: number
}

export interface UpcomingDeadline {
  id: Id
  title: string
  type: 'project' | 'quotation' | 'invoice'
  dueDate: string
  owner: string
}

export interface RecentActivity {
  id: Id
  actorName: string
  actorAvatarUrl?: string
  action: string
  target: string
  createdAt: string
}
