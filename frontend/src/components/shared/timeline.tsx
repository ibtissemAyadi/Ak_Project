import type { LucideIcon } from 'lucide-react'
import { Circle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/formatters'

export interface TimelineEntry {
  id: string
  title: string
  description?: string
  timestamp: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info'
}

const TONE_CLASSES: Record<NonNullable<TimelineEntry['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
  info: 'bg-info/15 text-info',
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {entries.map((entry) => {
        const Icon = entry.icon ?? Circle
        return (
          <li key={entry.id} className="relative">
            <span
              className={cn(
                'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background',
                TONE_CLASSES[entry.tone ?? 'default'],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
              </div>
              {entry.description ? <p className="text-sm text-muted-foreground">{entry.description}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
