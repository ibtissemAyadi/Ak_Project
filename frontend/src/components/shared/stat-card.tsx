import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'

interface StatCardProps {
  label: string
  value: number
  format?: 'currency' | 'number' | 'percent'
  deltaPct?: number
  trend?: 'up' | 'down' | 'flat'
  icon?: LucideIcon
  className?: string
}

export function StatCard({ label, value, format = 'number', deltaPct, trend = 'flat', icon: Icon, className }: StatCardProps) {
  const displayValue =
    format === 'currency' ? formatCurrency(value) : format === 'percent' ? `${value}%` : formatNumber(value)

  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus

  return (
    <Card className={cn('bg-secondary/25 shadow-sm', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{displayValue}</p>
        {typeof deltaPct === 'number' ? (
          <div className={cn('mt-1.5 inline-flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{formatPercent(deltaPct)}</span>
            <span className="font-normal text-muted-foreground">vs mois dernier</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
