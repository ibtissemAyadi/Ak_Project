import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
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
  adminOnly?: boolean
  requiredPermission?: { module: string; action: string }
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'CRM',
    to: '/crm/clients',
    icon: Users,
    children: [{ label: 'Clients', to: '/crm/clients' }],
  },
  {
    label: 'Devis',
    to: '/devis',
    icon: FileText,
    children: [
      { label: 'Tous les devis', to: '/devis' },
      { label: 'Vue Kanban', to: '/devis/kanban' },
    ],
  },
  { label: 'Affaires', to: '/affaires', icon: Briefcase, requiredPermission: { module: 'affaires', action: 'lecture' } },
  { label: 'Factures', to: '/factures', icon: Receipt },
  { label: 'Paiements', to: '/payments', icon: Wallet },
  { label: 'Documents', to: '/documents', icon: FolderOpen },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  {
    label: 'Administration',
    to: '/admin/users',
    icon: ShieldCheck,
    adminOnly: true,
    children: [
      { label: 'Utilisateurs', to: '/admin/users' },
      { label: 'Rôles', to: '/admin/roles' },
      { label: 'Permissions', to: '/admin/permissions' },
    ],
  },
  { label: 'Paramètres', to: '/settings', icon: Settings },
]

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  crm: 'CRM',
  clients: 'Clients',
  new: 'Nouveau',
  edit: 'Modifier',
  devis: 'Devis',
  kanban: 'Vue Kanban',
  affaires: 'Affaires',
  invoices: 'Factures',
  factures: 'Factures',
  payments: 'Paiements',
  documents: 'Documents',
  notifications: 'Notifications',
  settings: 'Paramètres',
  admin: 'Administration',
  users: 'Utilisateurs',
  roles: 'Rôles',
  permissions: 'Permissions',
  profile: 'Mon profil',
  reminders: 'Relances',
}
