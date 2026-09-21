import { TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RevenuePoint } from '@/types'
import { formatCurrency } from '@/lib/formatters'

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const estVide = data.every((point) => point.revenue === 0)

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Chiffre d'affaires prévisionnel par mois</CardTitle>
      </CardHeader>
      <CardContent className="h-72 pl-0">
        {estVide ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Aucun CA prévisionnel pour le moment</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ce montant est réparti par mois selon la date de fin prévue de chaque affaire en cours.
                Renseignez-la sur vos affaires pour voir apparaître le CA prévisionnel ici.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={40}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent))' }}
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" name="CA prévisionnel" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
