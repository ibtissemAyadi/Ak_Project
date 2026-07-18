export const COMPANY_NAME = 'AK Engineering Consulting'

// Base URL of the real Django backend (authentication only, for now).
export const API_BASE_URL = 'http://127.0.0.1:8000'

export const CURRENCY = 'EUR'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export const QUOTATION_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  draft: { label: 'Draft', variant: 'muted' },
  sent: { label: 'Sent', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'secondary' },
}

export const PROJECT_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  planning: { label: 'Planning', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'info' },
  on_hold: { label: 'On Hold', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export const PROJECT_PRIORITY_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  low: { label: 'Low', variant: 'muted' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'destructive' },
}

export const INVOICE_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  draft: { label: 'Draft', variant: 'muted' },
  sent: { label: 'Sent', variant: 'info' },
  paid: { label: 'Paid', variant: 'success' },
  partially_paid: { label: 'Partially Paid', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

export const PAYMENT_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'secondary' },
}

export const CLIENT_STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' }> = {
  active: { label: 'Active', variant: 'success' },
  prospect: { label: 'Prospect', variant: 'info' },
  inactive: { label: 'Inactive', variant: 'muted' },
}

export const NOTIFICATION_CATEGORY_META: Record<string, { label: string }> = {
  quotation: { label: 'Quotations' },
  invoice: { label: 'Invoices' },
  project: { label: 'Projects' },
  payment: { label: 'Payments' },
  document: { label: 'Documents' },
  system: { label: 'System' },
}

export const DOCUMENT_CATEGORY_META: Record<string, { label: string }> = {
  contract: { label: 'Contracts' },
  technical: { label: 'Technical' },
  financial: { label: 'Financial' },
  legal: { label: 'Legal' },
  report: { label: 'Reports' },
  other: { label: 'Other' },
}

export const USER_ROLE_META: Record<string, { label: string }> = {
  admin: { label: 'Administrator' },
  manager: { label: 'Project Manager' },
  engineer: { label: 'Engineer' },
  accountant: { label: 'Accountant' },
  sales: { label: 'Sales' },
}
