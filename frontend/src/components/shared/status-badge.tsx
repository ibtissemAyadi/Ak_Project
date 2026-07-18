import { Badge } from '@/components/ui/badge'

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted'

interface StatusMeta {
  label: string
  variant: Variant
}

interface StatusBadgeProps {
  status: string
  meta: Record<string, StatusMeta>
}

export function StatusBadge({ status, meta }: StatusBadgeProps) {
  const entry = meta[status] ?? { label: status, variant: 'secondary' as Variant }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
