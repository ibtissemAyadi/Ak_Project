import type { ColumnDef } from '@tanstack/react-table'

import type { AppUser } from '@/types'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { USER_ROLE_META } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/formatters'

const STATUS_VARIANT: Record<AppUser['status'], 'success' | 'warning' | 'muted'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'muted',
}

export const userColumns: ColumnDef<AppUser, any>[] = [
  {
    accessorKey: 'firstName',
    header: 'User',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={`${row.original.firstName} ${row.original.lastName}`} className="h-8 w-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge variant="secondary">{USER_ROLE_META[row.original.role]?.label}</Badge>,
  },
  { accessorKey: 'department', header: 'Department' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>,
  },
  {
    accessorKey: 'lastActiveAt',
    header: 'Last Active',
    cell: ({ row }) => <span className="text-muted-foreground">{formatRelativeTime(row.original.lastActiveAt)}</span>,
  },
]
