import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCheck, Settings2, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { FilterSelect } from '@/components/shared/filter-select'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotificationStore } from '@/store/notification-store'
import { NOTIFICATION_CATEGORY_META } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const DOT_CLASS: Record<string, string> = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markAsRead, markAllAsRead, dismiss } = useNotificationStore()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false
      if (readFilter === 'unread' && n.read) return false
      if (readFilter === 'read' && !n.read) return false
      return true
    })
  }, [notifications, categoryFilter, readFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Restez informé de l'activité sur vos clients, projets, factures et paiements."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/notifications/settings')}>
              <Settings2 className="h-4 w-4" />
              Paramètres
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Catégorie"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={Object.entries(NOTIFICATION_CATEGORY_META).map(([value, meta]) => ({ value, label: meta.label }))}
        />
        <FilterSelect
          label="Statut"
          value={readFilter}
          onChange={setReadFilter}
          options={[
            { value: 'unread', label: 'Non lu' },
            { value: 'read', label: 'Lu' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune notification" description="Vous êtes à jour." />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className={cn(!n.read && 'border-primary/30 bg-primary/[0.02]')}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT_CLASS[n.type])} />
                <div className="min-w-0 flex-1">
                  <Link to={n.link ?? '/notifications'} onClick={() => markAsRead(n.id)} className="block">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {NOTIFICATION_CATEGORY_META[n.category]?.label} · {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.read ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsRead(n.id)}>
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => dismiss(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
