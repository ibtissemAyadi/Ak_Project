import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  Receipt,
  Wallet,
  FolderOpen,
  Bell,
  ShieldCheck,
  Settings,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  children?: { label: string; to: string }[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'CRM',
    to: '/crm/clients',
    icon: Users,
    children: [{ label: 'Clients', to: '/crm/clients' }],
  },
  {
    label: 'Quotations',
    to: '/quotations',
    icon: FileText,
    children: [
      { label: 'All Quotations', to: '/quotations' },
      { label: 'Kanban Board', to: '/quotations/kanban' },
    ],
  },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'Invoices', to: '/invoices', icon: Receipt },
  { label: 'Payments', to: '/payments', icon: Wallet },
  { label: 'Documents', to: '/documents', icon: FolderOpen },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  {
    label: 'Administration',
    to: '/admin/users',
    icon: ShieldCheck,
    children: [
      { label: 'Users', to: '/admin/users' },
      { label: 'Roles', to: '/admin/roles' },
      { label: 'Permissions', to: '/admin/permissions' },
    ],
  },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM',
  clients: 'Clients',
  new: 'New',
  edit: 'Edit',
  quotations: 'Quotations',
  kanban: 'Kanban Board',
  projects: 'Projects',
  invoices: 'Invoices',
  payments: 'Payments',
  documents: 'Documents',
  notifications: 'Notifications',
  settings: 'Settings',
  admin: 'Administration',
  users: 'Users',
  roles: 'Roles',
  permissions: 'Permissions',
  profile: 'My Profile',
  reminders: 'Reminders',
}
