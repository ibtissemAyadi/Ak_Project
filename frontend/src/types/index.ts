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

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'check' | 'cash'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  id: Id
  reference: string
  invoiceId: Id
  invoiceReference: string
  clientId: Id
  clientName: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
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

export interface PaymentTimelineEntry {
  id: Id
  invoiceId: Id
  type: 'invoice_sent' | 'reminder_sent' | 'payment_received' | 'overdue'
  title: string
  description: string
  createdAt: string
}

// ---------- Documents ----------

export type DocumentCategory = 'contract' | 'technical' | 'financial' | 'legal' | 'report' | 'other'

export interface DocumentVersion {
  id: Id
  version: number
  uploadedBy: string
  uploadedAt: string
  sizeKb: number
  note?: string
}

export interface AppDocument {
  id: Id
  name: string
  category: DocumentCategory
  fileType: 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg' | 'dwg' | 'zip'
  sizeKb: number
  relatedTo?: string
  ownerName: string
  uploadedAt: string
  updatedAt: string
  versions: DocumentVersion[]
  tags: string[]
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
  deltaPct: number
  trend: 'up' | 'down' | 'flat'
}

export interface RevenuePoint {
  month: string
  revenue: number
  target: number
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
