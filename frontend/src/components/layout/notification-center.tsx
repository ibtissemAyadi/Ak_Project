import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/shared/empty-state'
import { useNotificationStore } from '@/store/notification-store'
import { formatRelativeTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const DOT_CLASS: Record<string, string> = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore()
  const recent = notifications.slice(0, 6)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer comme lu
            </Button>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <EmptyState title="Vous êtes à jour" description="Aucune nouvelle notification." className="border-0 py-8" />
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border">
              {recent.map((n) => (
                <Link
                  key={n.id}
                  to={n.link ?? '/notifications'}
                  onClick={() => markAsRead(n.id)}
                  className={cn('flex gap-3 px-4 py-3 transition-colors hover:bg-accent/60', !n.read && 'bg-accent/30')}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT_CLASS[n.type])} />
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs" asChild>
            <Link to="/notifications">Voir toutes les notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
