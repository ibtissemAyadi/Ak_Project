import type { RoleDefinition, UserRole } from '@/types'
import { MOCK_USERS } from '@/mocks/data/users'

export const PERMISSION_MODULES = [
  'Dashboard',
  'CRM',
  'Quotations',
  'Projects',
  'Invoices',
  'Payments',
  'Documents',
  'Administration',
] as const

type Level = { view: boolean; create: boolean; edit: boolean; delete: boolean }

function level(view: boolean, create: boolean, edit: boolean, del: boolean): Level {
  return { view, create, edit, delete: del }
}

function buildMatrix(overrides: Partial<Record<(typeof PERMISSION_MODULES)[number], Level>>) {
  const matrix: Record<string, Level> = {}
  for (const mod of PERMISSION_MODULES) {
    matrix[mod] = overrides[mod] ?? level(false, false, false, false)
  }
  return matrix
}

const ROLE_META: Record<UserRole, { label: string; description: string; color: string }> = {
  admin: { label: 'Administrator', description: 'Full access to every module, including user and role management.', color: '#1d4ed8' },
  manager: { label: 'Project Manager', description: 'Manages projects, teams, quotations and client relationships.', color: '#0ea5e9' },
  engineer: { label: 'Engineer', description: 'Works on assigned projects, tasks, time tracking and documents.', color: '#16a34a' },
  accountant: { label: 'Accountant', description: 'Handles invoicing, payments and financial reporting.', color: '#d97706' },
  sales: { label: 'Sales', description: 'Manages clients, contacts and quotations pipeline.', color: '#7c3aed' },
}

const ROLE_MATRICES: Record<UserRole, Record<string, Level>> = {
  admin: buildMatrix({
    Dashboard: level(true, true, true, true),
    CRM: level(true, true, true, true),
    Quotations: level(true, true, true, true),
    Projects: level(true, true, true, true),
    Invoices: level(true, true, true, true),
    Payments: level(true, true, true, true),
    Documents: level(true, true, true, true),
    Administration: level(true, true, true, true),
  }),
  manager: buildMatrix({
    Dashboard: level(true, false, false, false),
    CRM: level(true, true, true, false),
    Quotations: level(true, true, true, false),
    Projects: level(true, true, true, false),
    Invoices: level(true, false, false, false),
    Payments: level(true, false, false, false),
    Documents: level(true, true, true, false),
    Administration: level(false, false, false, false),
  }),
  engineer: buildMatrix({
    Dashboard: level(true, false, false, false),
    CRM: level(true, false, false, false),
    Quotations: level(true, false, false, false),
    Projects: level(true, false, true, false),
    Documents: level(true, true, false, false),
  }),
  accountant: buildMatrix({
    Dashboard: level(true, false, false, false),
    CRM: level(true, false, false, false),
    Invoices: level(true, true, true, false),
    Payments: level(true, true, true, false),
    Documents: level(true, true, false, false),
  }),
  sales: buildMatrix({
    Dashboard: level(true, false, false, false),
    CRM: level(true, true, true, false),
    Quotations: level(true, true, true, false),
    Documents: level(true, true, false, false),
  }),
}

export const MOCK_ROLES: RoleDefinition[] = (Object.keys(ROLE_META) as UserRole[]).map((role, index) => ({
  id: `role-${index + 1}`,
  name: role,
  label: ROLE_META[role].label,
  description: ROLE_META[role].description,
  color: ROLE_META[role].color,
  userCount: MOCK_USERS.filter((u) => u.role === role).length,
  permissions: ROLE_MATRICES[role],
}))

export function getRoleByName(name: UserRole) {
  return MOCK_ROLES.find((r) => r.name === name)
}
